"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { format } from "date-fns";
import { CalendarDays, Eye, EyeOff, Pencil, Plus, Send, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type EventVisibility = "public" | "members_only" | "invite_only";
type EventAudience = "community" | "club" | "academy";
type EventStatus = "draft" | "published" | "cancelled";
type LocationType = "physical" | "online" | "hybrid";
type TierAccess = "public" | "community" | "club" | "academy" | "invite_only";

interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  audience: EventAudience;
  visibility: EventVisibility;
  status: EventStatus;
  location_type: LocationType;
  timezone: string;
  location_area: string | null;
  is_location_private: boolean;
  location: string | null;
  pool_id: string | null;
  start_time: string;
  end_time: string | null;
  max_capacity: number | null;
  tier_access: TierAccess;
  cost_naira: number | null;
  rsvp_count?: Record<string, number>;
}

interface EventInvite {
  member_id: string;
}

interface MemberOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

type EventForm = {
  title: string;
  description: string;
  event_type: string;
  audience: EventAudience;
  visibility: EventVisibility;
  status: EventStatus;
  location_type: LocationType;
  timezone: string;
  location_area: string;
  is_location_private: boolean;
  pool_id: string | null;
  location: string;
  start_time: string;
  end_time: string;
  max_capacity: string;
  tier_access: TierAccess;
  cost_naira: string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  event_type: "social",
  audience: "community",
  visibility: "public",
  status: "draft",
  location_type: "physical",
  timezone: "Africa/Lagos",
  location_area: "",
  is_location_private: false,
  pool_id: null,
  location: "",
  start_time: "",
  end_time: "",
  max_capacity: "",
  tier_access: "public",
  cost_naira: "",
};

const PRESETS: Array<{
  label: string;
  values: Partial<EventForm>;
}> = [
  {
    label: "Water Room",
    values: {
      title: "SwimBuddz Water Room",
      event_type: "online_talk",
      audience: "community",
      visibility: "public",
      tier_access: "public",
      location_type: "online",
      location: "Online",
    },
  },
  {
    label: "Open Swim",
    values: {
      title: "Monthly Open Swim Meetup",
      event_type: "open_swim",
      audience: "community",
      visibility: "public",
      tier_access: "public",
    },
  },
  {
    label: "Assessment",
    values: {
      title: "Free Intro-to-Water Assessment",
      event_type: "assessment",
      audience: "academy",
      visibility: "public",
      tier_access: "public",
    },
  },
  {
    label: "Club listing",
    values: {
      title: "Club Location Training",
      event_type: "club_training",
      audience: "club",
      visibility: "public",
      tier_access: "club",
      is_location_private: true,
    },
  },
  {
    label: "Quarter Meet",
    values: {
      title: "Buddz Cup and Community Meet",
      event_type: "quarter_meet",
      audience: "community",
      visibility: "public",
      tier_access: "community",
    },
  },
  {
    label: "Wrapped",
    values: {
      title: "SwimBuddz Wrapped",
      event_type: "wrapped",
      audience: "community",
      visibility: "public",
      tier_access: "community",
    },
  },
];

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function eventToForm(event: EventRecord): EventForm {
  return {
    title: event.title,
    description: event.description ?? "",
    event_type: event.event_type,
    audience: event.audience,
    visibility: event.visibility,
    status: event.status,
    location_type: event.location_type,
    timezone: event.timezone,
    location_area: event.location_area ?? "",
    is_location_private: event.is_location_private,
    pool_id: event.pool_id,
    location: event.location ?? "",
    start_time: toLocalInput(event.start_time),
    end_time: toLocalInput(event.end_time),
    max_capacity: event.max_capacity ? String(event.max_capacity) : "",
    tier_access: event.tier_access,
    cost_naira: event.cost_naira ? String(event.cost_naira) : "",
  };
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [inviteeIds, setInviteeIds] = useState<string[]>([]);
  const [existingInviteeIds, setExistingInviteeIds] = useState<string[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const rows = await apiGet<EventRecord[]>("/api/v1/events/?upcoming_only=false", {
        auth: true,
      });
      setEvents(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const loadMembers = useCallback(async () => {
    if (members.length > 0) return;
    try {
      const rows = await apiGet<MemberOption[]>("/api/v1/admin/members/?limit=100", {
        auth: true,
      });
      setMembers(rows);
    } catch {
      toast.error("Members could not be loaded for invitations");
    }
  }, [members.length]);

  const openCreate = (values?: Partial<EventForm>) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, ...values });
    setInviteeIds([]);
    setExistingInviteeIds([]);
    setShowForm(true);
  };

  const openEdit = async (event: EventRecord) => {
    setEditing(event);
    setForm(eventToForm(event));
    setInviteeIds([]);
    setExistingInviteeIds([]);
    setShowForm(true);
    if (event.visibility === "invite_only") {
      await loadMembers();
      try {
        const rows = await apiGet<EventInvite[]>(`/api/v1/events/${event.id}/invites`, {
          auth: true,
        });
        const ids = rows.map((invite) => invite.member_id);
        setInviteeIds(ids);
        setExistingInviteeIds(ids);
      } catch {
        toast.error("Invitations could not be loaded");
      }
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setInviteeIds([]);
    setExistingInviteeIds([]);
  };

  const syncInvites = async (eventId: string) => {
    const added = inviteeIds.filter((id) => !existingInviteeIds.includes(id));
    const removed = existingInviteeIds.filter((id) => !inviteeIds.includes(id));
    if (added.length > 0) {
      await apiPost(`/api/v1/events/${eventId}/invites`, { member_ids: added }, { auth: true });
    }
    await Promise.all(
      removed.map((memberId) =>
        apiDelete(`/api/v1/events/${eventId}/invites/${memberId}`, {
          auth: true,
        })
      )
    );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      event_type: form.event_type,
      audience: form.audience,
      visibility: form.visibility,
      status: form.status,
      location_type: form.location_type,
      timezone: form.timezone,
      location_area: form.location_area || null,
      is_location_private: form.is_location_private,
      pool_id: form.pool_id,
      location: form.location || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      tier_access: form.visibility === "invite_only" ? "invite_only" : form.tier_access,
      cost_naira: form.cost_naira ? Number(form.cost_naira) : null,
    };

    try {
      const saved = editing
        ? await apiPatch<EventRecord>(`/api/v1/events/${editing.id}`, payload, {
            auth: true,
          })
        : await apiPost<EventRecord>("/api/v1/events/", payload, {
            auth: true,
          });
      if (form.visibility === "invite_only") {
        await syncInvites(saved.id);
      }
      toast.success(editing ? "Event updated" : "Event created");
      closeForm();
      await fetchEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event and its RSVPs?")) return;
    try {
      await apiDelete(`/api/v1/events/${eventId}`, { auth: true });
      toast.success("Event deleted");
      await fetchEvents();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete event");
    }
  };

  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return members.filter((member) => {
      if (!query) return inviteeIds.includes(member.id);
      return `${member.first_name} ${member.last_name} ${member.email}`
        .toLowerCase()
        .includes(query);
    });
  }, [inviteeIds, memberSearch, members]);

  if (loading) return <LoadingPage text="Loading events..." />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan-700">Community operations</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
            Events and Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Published events appear on the website calendar. Sessions are managed separately under
            Admin Sessions.
          </p>
        </div>
        {!showForm ? (
          <Button onClick={() => openCreate()} className="flex w-fit items-center gap-2">
            <Plus className="h-4 w-4" />
            Create event
          </Button>
        ) : null}
      </header>

      {!showForm ? (
        <section className="border-y border-slate-200 py-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Start from an activity template
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="secondary"
                onClick={() => openCreate(preset.values)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {showForm ? (
        <form onSubmit={handleSave} className="space-y-5 border-y border-slate-200 py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-950">
              {editing ? "Edit event" : "Create event"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
              aria-label="Close event form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Event title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
            <Select
              label="Activity type"
              value={form.event_type}
              onChange={(event) => setForm({ ...form, event_type: event.target.value })}
            >
              <option value="online_talk">Online talk / Water Room</option>
              <option value="open_swim">Open swim</option>
              <option value="social">Social</option>
              <option value="assessment">Assessment</option>
              <option value="bring_a_buddy">Bring-a-Buddy</option>
              <option value="quarter_meet">Quarter meet / Buddz Cup</option>
              <option value="graduation">Academy graduation</option>
              <option value="volunteer">Volunteer</option>
              <option value="wrapped">SwimBuddz Wrapped</option>
              <option value="club_training">Club location listing</option>
            </Select>
          </div>

          <Textarea
            label="Description"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={4}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Calendar audience"
              value={form.audience}
              onChange={(event) =>
                setForm({
                  ...form,
                  audience: event.target.value as EventAudience,
                })
              }
            >
              <option value="community">Community</option>
              <option value="club">Club</option>
              <option value="academy">Academy</option>
            </Select>
            <Select
              label="Website visibility"
              value={form.visibility}
              onChange={async (event) => {
                const next = event.target.value as EventVisibility;
                setForm({ ...form, visibility: next });
                if (next === "invite_only") await loadMembers();
              }}
            >
              <option value="public">Public</option>
              <option value="members_only">Members-only</option>
              <option value="invite_only">Invite-only</option>
            </Select>
            <Select
              label="Attendance access"
              value={form.visibility === "invite_only" ? "invite_only" : form.tier_access}
              disabled={form.visibility === "invite_only"}
              onChange={(event) =>
                setForm({
                  ...form,
                  tier_access: event.target.value as TierAccess,
                })
              }
            >
              <option value="public">Anyone who registers</option>
              <option value="community">Community members</option>
              <option value="club">Club members</option>
              <option value="academy">Academy students</option>
              <option value="invite_only">Invitees only</option>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Publication status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value as EventStatus })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select
              label="Format"
              value={form.location_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  location_type: event.target.value as LocationType,
                })
              }
            >
              <option value="physical">Physical</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </Select>
            <Input
              label="Timezone"
              value={form.timezone}
              onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              placeholder="Africa/Lagos"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Start date and time"
              type="datetime-local"
              value={form.start_time}
              onChange={(event) => setForm({ ...form, start_time: event.target.value })}
              required
            />
            <Input
              label="End date and time"
              type="datetime-local"
              value={form.end_time}
              onChange={(event) => setForm({ ...form, end_time: event.target.value })}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PoolPicker
              label="Pool venue"
              value={form.pool_id}
              onChange={(poolId, poolName) =>
                setForm({
                  ...form,
                  pool_id: poolId,
                  location: poolId ? (poolName ?? "") : form.location,
                })
              }
              hint="Optional for online or non-pool events."
            />
            <div className="grid gap-4">
              <Input
                label="Venue or meeting link"
                value={form.location}
                onChange={(event) =>
                  setForm({
                    ...form,
                    pool_id: null,
                    location: event.target.value,
                  })
                }
                placeholder="Pool, venue, or online platform"
              />
              <Input
                label="Location area"
                value={form.location_area}
                onChange={(event) => setForm({ ...form, location_area: event.target.value })}
                placeholder="Yaba, Victoria Island, Online"
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_location_private}
              onChange={(event) =>
                setForm({
                  ...form,
                  is_location_private: event.target.checked,
                })
              }
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            Hide the exact venue until the viewer is eligible to attend
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Maximum capacity"
              type="number"
              min={1}
              value={form.max_capacity}
              onChange={(event) => setForm({ ...form, max_capacity: event.target.value })}
            />
            <Input
              label="Attendee price (₦)"
              type="number"
              min={0}
              value={form.cost_naira}
              onChange={(event) => setForm({ ...form, cost_naira: event.target.value })}
              placeholder="0 for free"
            />
          </div>

          {form.visibility === "invite_only" ? (
            <fieldset className="space-y-3 border-y border-slate-200 py-4">
              <legend className="text-sm font-semibold text-slate-800">Invitees</legend>
              <Input
                label="Find members"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by name or email"
              />
              <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto border-y border-slate-200">
                {filteredMembers.map((member) => {
                  const selected = inviteeIds.includes(member.id);
                  return (
                    <label key={member.id} className="flex items-center gap-3 px-2 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setInviteeIds((current) =>
                            selected
                              ? current.filter((id) => id !== member.id)
                              : [...current, member.id]
                          )
                        }
                      />
                      <span className="font-medium text-slate-800">
                        {member.first_name} {member.last_name}
                      </span>
                      <span className="truncate text-slate-500">{member.email}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">{inviteeIds.length} members selected</p>
            </fieldset>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {form.status === "published" ? <Send className="mr-2 h-4 w-4" /> : null}
              {saving
                ? "Saving..."
                : editing
                  ? "Save changes"
                  : form.status === "published"
                    ? "Create and publish"
                    : "Save draft"}
            </Button>
          </div>
        </form>
      ) : null}

      {events.length === 0 && !showForm ? (
        <div className="border-y border-slate-200 py-14 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No events have been scheduled</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a draft from a template, confirm its details, then publish it.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Card key={event.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-950">{event.title}</h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {event.audience}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        event.status === "published"
                          ? "bg-green-100 text-green-800"
                          : event.status === "draft"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {format(new Date(event.start_time), "EEE, d MMM yyyy · h:mm a")}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      {event.visibility === "public" ? (
                        <Eye className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      {event.visibility.replace("_", " ")}
                    </span>
                    <span>{event.event_type.replaceAll("_", " ")}</span>
                    <span>{event.tier_access.replace("_", " ")} access</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {event.rsvp_count?.going ?? 0}
                      {event.max_capacity ? ` / ${event.max_capacity}` : ""} going
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => void openEdit(event)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                    aria-label={`Edit ${event.title}`}
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(event.id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${event.title}`}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
