"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import {
  ClubPool,
  CommunityExperienceOffering,
  createCommunityExperience,
} from "@/lib/clubOnboarding";
import { formatCurrency } from "@/lib/upgradeContext";
import { toast } from "sonner";
import { ExperienceConfigurationRecovery } from "@/components/admin/ExperienceConfigurationRecovery";
import { RescheduleClubPractice } from "@/components/club/RescheduleClubPractice";

type EventOption = {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  status: string;
  visibility: string;
  community_experience_offering_id?: string | null;
};
type EventLink = {
  event_id: string;
  club_impact: "separate" | "parallel" | "replaces";
  replaced_session_ids: string[];
};
type LinkedEvent = EventOption & {
  club_impact: EventLink["club_impact"];
  replaced_session_ids: string[];
};
type RosterRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticket_kind: string;
  price_kobo: number;
  waiver_accepted_at: string | null;
  emergency_contact: { name?: string; phone?: string };
  checked_in_event_ids: string[];
};
type SessionOption = { id: string; title: string; starts_at: string; status: string };
const css = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
const money = (value: number) => formatCurrency(value / 100);
const empty = {
  name: "",
  period_start: "",
  period_end: "",
  standard: "",
  club: "",
  bundle: "",
  guest: "",
  public_guest: "",
  max_guests: "0",
  capacity: "",
  opens: "",
  closes: "",
  active: false,
};
const priceFields = [
  ["standard", "Standard member price (₦)"],
  ["club", "Club member buying later (₦)"],
  ["bundle", "Bought alongside Club (₦)"],
  ["guest", "Member guest / +1 (₦, blank disables)"],
  ["public_guest", "Public guest (₦, blank disables)"],
] as const;
const optionalPrice = (value: string) => (value === "" ? null : Math.round(Number(value) * 100));

export default function ExperienceAdminPage() {
  const offerings = useApi<CommunityExperienceOffering[]>(
    "/api/v1/clubs/community-experiences/admin"
  );
  const events = useApi<EventOption[]>("/api/v1/events/?upcoming_only=false");
  const pools = useApi<{ items: ClubPool[] }>("/api/v1/pools?page_size=100", { auth: false });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<CommunityExperienceOffering | null>(null);
  const [links, setLinks] = useState<EventLink[]>([]);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [recommended, setRecommended] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save Experience");
    } finally {
      setBusy(false);
    }
  };
  const open = async (offering: CommunityExperienceOffering) => {
    setEditing(offering);
    const [linked, participants] = await Promise.all([
      apiGet<{ events: LinkedEvent[]; recommended_standard_price_kobo: number }>(
        `/api/v1/clubs/community-experiences/admin/${offering.id}/events`,
        { auth: true }
      ),
      apiGet<RosterRow[]>(`/api/v1/clubs/community-experiences/admin/${offering.id}/participants`, {
        auth: true,
      }),
    ]);
    setEditing(offering);
    setLinks(
      linked.events.map((e) => ({
        event_id: e.id,
        club_impact: e.club_impact,
        replaced_session_ids: e.replaced_session_ids,
      }))
    );
    setRoster(participants);
    setRecommended(linked.recommended_standard_price_kobo);
    setSessions([]);
    setForm({
      name: offering.name,
      period_start: offering.period_start,
      period_end: offering.period_end,
      standard: String(offering.standard_member_fee_kobo / 100),
      club: String(offering.club_member_fee_kobo / 100),
      bundle: String(offering.club_bundle_fee_kobo / 100),
      guest:
        offering.member_guest_fee_kobo == null ? "" : String(offering.member_guest_fee_kobo / 100),
      public_guest:
        offering.public_guest_fee_kobo == null ? "" : String(offering.public_guest_fee_kobo / 100),
      max_guests: String(offering.max_guests_per_member ?? 0),
      capacity: offering.capacity == null ? "" : String(offering.capacity),
      opens: offering.purchase_opens_at?.slice(0, 16) ?? "",
      closes: offering.purchase_closes_at?.slice(0, 16) ?? "",
      active: offering.is_active,
    });
  };
  const field = (key: keyof typeof empty, value: string | boolean) =>
    setForm((old) => ({ ...old, [key]: value }));
  const save = async () => {
    const body = {
      name: form.name,
      currency: "NGN",
      period_start: form.period_start,
      period_end: form.period_end,
      standard_member_fee_kobo: optionalPrice(form.standard) ?? 0,
      club_member_fee_kobo: optionalPrice(form.club) ?? 0,
      club_bundle_fee_kobo: optionalPrice(form.bundle) ?? 0,
      member_guest_fee_kobo: optionalPrice(form.guest),
      public_guest_fee_kobo: optionalPrice(form.public_guest),
      max_guests_per_member: Number(form.max_guests),
      capacity: form.capacity ? Number(form.capacity) : null,
      purchase_opens_at: form.opens ? `${form.opens}:00Z` : null,
      purchase_closes_at: form.closes ? `${form.closes}:00Z` : null,
      is_active: form.active,
    };
    const result = editing
      ? await apiPut<CommunityExperienceOffering>(
          `/api/v1/clubs/community-experiences/admin/${editing.id}`,
          body,
          { auth: true }
        )
      : await createCommunityExperience(body);
    await offerings.refetch();
    await open(result);
    toast.success("Offering saved. Actual published Events are required before sales.");
  };
  if (offerings.loading) return <LoadingCard text="Loading Experience offerings..." />;
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-8">
      <header>
        <h1 className="text-3xl font-bold">Community Experience offerings</h1>
        <p className="my-2 text-slate-600">
          A separate Community product: one day out, a multi-day trip, or several Events under one
          ticket. Prices below are the only admission prices for linked Events.
        </p>
        <Link className="text-cyan-700 underline" href="/admin/community/events">
          Create Events, venues, itinerary, costs and reminders first
        </Link>
      </header>
      {(error || offerings.error || events.error) && (
        <Alert variant="error">{error || offerings.error || events.error}</Alert>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {offerings.data?.map((o) => (
          <Card key={o.id}>
            <h2 className="font-semibold">
              {o.name} · {o.is_active ? "Active" : "Draft / closed"}
            </h2>
            <p>
              {o.period_start} → {o.period_end}
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => open(o))}
            >
              Edit offering, Events and roster
            </Button>
          </Card>
        ))}
      </div>
      {editing && <ExperienceConfigurationRecovery key={editing.id} offeringId={editing.id} />}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{editing ? "Edit offering" : "New offering"}</h2>
          {editing && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(empty);
                setLinks([]);
                setRoster([]);
              }}
            >
              New offering
            </Button>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(save);
          }}
        >
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              Offering name
              <input
                required
                className={css}
                value={form.name}
                onChange={(e) => field("name", e.target.value)}
              />
            </label>
            {(
              [
                ["period_start", "Quarter starts"],
                ["period_end", "Quarter ends"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required
                  type="date"
                  className={css}
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
            {priceFields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  required={["standard", "club", "bundle"].includes(key)}
                  type="number"
                  min="0"
                  step="0.01"
                  className={css}
                  value={form[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              Maximum guests per member
              <input
                required
                type="number"
                min="0"
                max="20"
                className={css}
                value={form.max_guests}
                onChange={(e) => field("max_guests", e.target.value)}
              />
            </label>
            <label>
              Package capacity (optional)
              <input
                type="number"
                min="1"
                className={css}
                value={form.capacity}
                onChange={(e) => field("capacity", e.target.value)}
              />
            </label>
            <label>
              Purchases open (UTC, optional)
              <input
                type="datetime-local"
                className={css}
                value={form.opens}
                onChange={(e) => field("opens", e.target.value)}
              />
            </label>
            <label>
              Purchases close (UTC, optional)
              <input
                type="datetime-local"
                className={css}
                value={form.closes}
                onChange={(e) => field("closes", e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => field("active", e.target.checked)}
              />{" "}
              Active (sales also require published linked Events)
            </label>
          </fieldset>
          <p className="my-4 text-sm text-slate-600">
            Existing orders keep their purchased prices. Sold package contents and commercial dates
            cannot be rewritten. Capacity is limited by the smallest linked Event as well.
          </p>
          <Button disabled={busy} type="submit">
            Save offering
          </Button>
        </form>
      </Card>
      {editing && (
        <Card>
          <h2 className="text-xl font-semibold">Included Events and Club impact</h2>
          <p className="my-3 text-slate-600">
            Keep Club running for non-attenders with Separate or Parallel. Replaces cancels only
            explicitly selected future, unbooked swims not promised in a published quarter. For a
            promised or booked swim, use Reschedule below, then keep the Experience Separate or
            Parallel; the swim keeps its identity and purchased coverage. Q4 wrap-up suggestion:
            first Saturday of December; other quarters: last Saturday. Event dates remain
            authoritative.
          </p>
          <div className="space-y-3">
            {events.data
              ?.filter(
                (e) =>
                  (!e.community_experience_offering_id ||
                    e.community_experience_offering_id === editing.id) &&
                  e.start_time.slice(0, 10) >= form.period_start &&
                  e.start_time.slice(0, 10) <= form.period_end
              )
              .map((event) => {
                const link = links.find((l) => l.event_id === event.id);
                return (
                  <div key={event.id} className="rounded-lg border p-3">
                    <label>
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={Boolean(link)}
                        onChange={(e) =>
                          setLinks((old) =>
                            e.target.checked
                              ? [
                                  ...old,
                                  {
                                    event_id: event.id,
                                    club_impact: "separate",
                                    replaced_session_ids: [],
                                  },
                                ]
                              : old.filter((l) => l.event_id !== event.id)
                          )
                        }
                      />{" "}
                      {event.title} · {new Date(event.start_time).toLocaleDateString("en-NG")} →{" "}
                      {new Date(event.end_time ?? event.start_time).toLocaleDateString("en-NG")} ·{" "}
                      {event.status} · {event.visibility}
                    </label>
                    {link && (
                      <div className="mt-3">
                        <label>
                          Club impact
                          <select
                            className={css}
                            value={link.club_impact}
                            disabled={busy}
                            onChange={(e) =>
                              setLinks((old) =>
                                old.map((l) =>
                                  l.event_id === event.id
                                    ? {
                                        ...l,
                                        club_impact: e.target.value as EventLink["club_impact"],
                                        replaced_session_ids: [],
                                      }
                                    : l
                                )
                              )
                            }
                          >
                            <option value="separate">Separate — Club unchanged</option>
                            <option value="parallel">
                              Parallel — swim still available for non-attenders
                            </option>
                            <option value="replaces">
                              Replaces — cancel explicit unbooked sessions
                            </option>
                          </select>
                        </label>
                        {link.club_impact === "replaces" && (
                          <div className="mt-3 space-y-2">
                            <label>
                              Load affected pool sessions
                              <select
                                defaultValue=""
                                className={css}
                                disabled={busy}
                                onChange={(e) => {
                                  if (e.target.value)
                                    run(async () =>
                                      setSessions(
                                        await apiGet<SessionOption[]>(
                                          `/api/v1/clubs/community-experiences/admin/${editing.id}/club-sessions?pool_id=${e.target.value}`,
                                          { auth: true }
                                        )
                                      )
                                    );
                                }}
                              >
                                <option value="">Choose pool</option>
                                {pools.data?.items.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {sessions
                              .filter(
                                (s) =>
                                  s.starts_at.slice(0, 10) >= event.start_time.slice(0, 10) &&
                                  s.starts_at.slice(0, 10) <=
                                    (event.end_time ?? event.start_time).slice(0, 10)
                              )
                              .map((s) => (
                                <div key={s.id}>
                                  <label className="block">
                                    <input
                                      type="checkbox"
                                      checked={link.replaced_session_ids.includes(s.id)}
                                      onChange={(e) =>
                                        setLinks((old) =>
                                          old.map((l) =>
                                            l.event_id === event.id
                                              ? {
                                                  ...l,
                                                  replaced_session_ids: e.target.checked
                                                    ? [...l.replaced_session_ids, s.id]
                                                    : l.replaced_session_ids.filter(
                                                        (id) => id !== s.id
                                                      ),
                                                }
                                              : l
                                          )
                                        )
                                      }
                                    />{" "}
                                    {s.title} · {s.starts_at} · {s.status}
                                  </label>
                                  <RescheduleClubPractice
                                    sessionId={s.id}
                                    onChanged={async () => {
                                      setLinks((old) =>
                                        old.map((l) => ({
                                          ...l,
                                          replaced_session_ids: l.replaced_session_ids.filter(
                                            (id) => id !== s.id
                                          ),
                                        }))
                                      );
                                      setSessions((old) => old.filter((item) => item.id !== s.id));
                                    }}
                                  />
                                </div>
                              ))}
                            <p className="text-sm text-amber-800">
                              {link.replaced_session_ids.length} sessions marked for cancellation.
                              Removing a link later does not reinstate a cancelled swim.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
          <Button
            className="mt-4"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await apiPut(
                  `/api/v1/clubs/community-experiences/admin/${editing.id}/events`,
                  { events: links },
                  { auth: true }
                );
                await open(editing);
                await events.refetch();
                toast.success("Event package saved");
              })
            }
          >
            Save Event links and explicit replacements
          </Button>
          <p className="mt-4">
            Event cost-plus recommendation: {money(recommended)} per participant.
          </p>
          <Button
            className="mt-2"
            disabled={busy || !links.length}
            variant="outline"
            onClick={() => field("standard", String(recommended / 100))}
          >
            Use recommendation for standard member price
          </Button>
        </Card>
      )}
      {editing && (
        <Card>
          <h2 className="text-xl font-semibold">Confirmed participants and attendance</h2>
          <p className="my-2 text-sm text-slate-600">
            Each person counts against capacity. Bundled members must complete safety details on
            their Experience page before check-in.
          </p>
          <Link href={`/experiences/${editing.id}`} className="text-cyan-700 underline">
            Member / public ticket page
          </Link>
          {!roster.length && <p className="mt-4">No confirmed tickets yet.</p>}
          {roster.map((person) => (
            <div className="mt-4 rounded-lg border p-3" key={person.id}>
              <p className="font-semibold">
                {person.name} · {person.ticket_kind.replaceAll("_", " ")} ·{" "}
                {money(person.price_kobo)}
              </p>
              <p className="text-sm">
                {person.email} · {person.phone}
              </p>
              <p className="text-sm">
                Emergency: {person.emergency_contact.name || "not recorded"} ·{" "}
                {person.emergency_contact.phone}
              </p>
              <p className="text-sm">
                Waiver: {person.waiver_accepted_at ? "accepted" : "required"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {links.map((link) => (
                  <Button
                    key={link.event_id}
                    variant="outline"
                    disabled={
                      busy ||
                      !person.waiver_accepted_at ||
                      person.checked_in_event_ids.includes(link.event_id)
                    }
                    onClick={() =>
                      run(async () => {
                        await apiPost(
                          `/api/v1/clubs/community-experiences/admin/participants/${person.id}/check-in`,
                          { event_id: link.event_id },
                          { auth: true }
                        );
                        await open(editing);
                      })
                    }
                  >
                    {person.checked_in_event_ids.includes(link.event_id)
                      ? "Checked in"
                      : "Check in"}{" "}
                    · {events.data?.find((e) => e.id === link.event_id)?.title ?? "Event"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
