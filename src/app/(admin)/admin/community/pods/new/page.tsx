"use client";

/**
 * Admin: Create a new pod.
 *
 * Schedule fields are optional — when blank the pod inherits the parent
 * Club's default day/time/duration. The Pod Lead must already be a Member
 * (peer-led; no coach role required).
 */

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { listClubs, type Club } from "@/lib/clubs";
import { MembersApi, type MemberListItem } from "@/lib/members";
import {
  adminCreatePod,
  type DayOfWeek,
  type PodCreateInput,
  type PodVisibility,
} from "@/lib/pods";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

interface FormState {
  club_id: string;
  pod_lead_id: string;
  assistant_pod_lead_id: string;
  name: string;
  handle: string;
  description: string;
  min_size: number;
  max_size: number;
  default_session_day: DayOfWeek | "";
  default_session_time: string;
  default_session_duration_minutes: number | "";
  visibility: PodVisibility;
}

const empty: FormState = {
  club_id: "",
  pod_lead_id: "",
  assistant_pod_lead_id: "",
  name: "",
  handle: "",
  description: "",
  min_size: 2,
  max_size: 5,
  default_session_day: "",
  default_session_time: "",
  default_session_duration_minutes: "",
  visibility: "public",
};

export default function NewPodPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // When linked from a club detail page (/admin/community/clubs/[id] →
  // "Create pod"), the club_id query param pre-selects the club so the
  // admin doesn't have to re-pick it.
  const presetClubId = searchParams?.get("club_id") ?? "";

  const [clubs, setClubs] = useState<Club[]>([]);
  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({ ...empty, club_id: presetClubId });
  const [memberSearch, setMemberSearch] = useState("");
  const [assistantSearch, setAssistantSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [c, m] = await Promise.all([
          listClubs(true),
          MembersApi.listMembers(0, 500),
        ]);
        setClubs(c);
        setMembers(m);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load form data");
      } finally {
        setLoadingDeps(false);
      }
    }
    void load();
  }, []);

  const memberOptions = useMemo(() => {
    return members.map((m) => ({
      id: m.id,
      label: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email || m.id,
      email: m.email,
    }));
  }, [members]);

  const filterMembers = (q: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return memberOptions.slice(0, 12);
    return memberOptions
      .filter(
        (o) =>
          o.label.toLowerCase().includes(needle) ||
          (o.email ?? "").toLowerCase().includes(needle),
      )
      .slice(0, 20);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.club_id) return setError("Please pick a club.");
    if (!form.pod_lead_id) return setError("Please pick a Pod Lead.");
    if (form.max_size < form.min_size) {
      return setError("Max size must be ≥ min size.");
    }

    const payload: PodCreateInput = {
      club_id: form.club_id,
      pod_lead_id: form.pod_lead_id,
      min_size: form.min_size,
      max_size: form.max_size,
      visibility: form.visibility,
    };
    if (form.assistant_pod_lead_id)
      payload.assistant_pod_lead_id = form.assistant_pod_lead_id;
    if (form.name.trim()) payload.name = form.name.trim();
    if (form.handle.trim()) payload.handle = form.handle.trim().toLowerCase();
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.default_session_day) payload.default_session_day = form.default_session_day;
    if (form.default_session_time)
      payload.default_session_time = form.default_session_time;
    if (form.default_session_duration_minutes)
      payload.default_session_duration_minutes = Number(
        form.default_session_duration_minutes,
      );

    setSubmitting(true);
    try {
      const created = await adminCreatePod(payload);
      router.push(`/admin/community/pods/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create pod");
      setSubmitting(false);
    }
  };

  if (loadingDeps) return <LoadingPage />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/community/pods"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to pods
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Create pod</h1>
        <p className="mt-1 text-sm text-gray-500">
          A pod is a 2–5 member training crew. Schedule fields default to the
          parent club's defaults.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Club */}
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-gray-900">Where</h2>
          <Select
            label="Club"
            required
            value={form.club_id}
            onChange={(e) => setForm({ ...form, club_id: e.target.value })}
          >
            <option value="">Select a club…</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Card>

        {/* Identity */}
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-gray-900">Identity</h2>
          <Input
            label="Handle"
            placeholder="dolphins"
            hint='Public "username" e.g. Dolphins, Orcas. Unique per club. Optional — if blank, the slug is used.'
            value={form.handle}
            onChange={(e) =>
              setForm({ ...form, handle: e.target.value.toLowerCase() })
            }
          />
          <Input
            label="Display name"
            placeholder="(auto-named if blank: club-slug-pod-N)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Textarea
            label="Description"
            placeholder="Optional"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Card>

        {/* Leadership */}
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-gray-900">Leadership</h2>
          <p className="text-xs text-gray-500">
            Pods are peer-led — no coaches. The Pod Lead is a Member who runs
            sessions and keeps the chat alive.
          </p>
          <MemberPickerField
            label="Pod Lead"
            required
            value={form.pod_lead_id}
            search={memberSearch}
            onSearchChange={setMemberSearch}
            options={filterMembers(memberSearch)}
            onPick={(id) => setForm({ ...form, pod_lead_id: id })}
          />
          <MemberPickerField
            label="Assistant Pod Lead (optional)"
            value={form.assistant_pod_lead_id}
            search={assistantSearch}
            onSearchChange={setAssistantSearch}
            options={filterMembers(assistantSearch)}
            onPick={(id) => setForm({ ...form, assistant_pod_lead_id: id })}
            allowClear
          />
        </Card>

        {/* Sizing & visibility */}
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-gray-900">Capacity & visibility</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Min size"
              type="number"
              min={1}
              max={10}
              value={form.min_size}
              onChange={(e) =>
                setForm({ ...form, min_size: Number(e.target.value) })
              }
            />
            <Input
              label="Max size"
              type="number"
              min={1}
              max={10}
              value={form.max_size}
              onChange={(e) =>
                setForm({ ...form, max_size: Number(e.target.value) })
              }
            />
            <Select
              label="Visibility"
              value={form.visibility}
              onChange={(e) =>
                setForm({ ...form, visibility: e.target.value as PodVisibility })
              }
            >
              <option value="public">Public (in directory)</option>
              <option value="private">Private (admin-assigned)</option>
            </Select>
          </div>
        </Card>

        {/* Schedule (optional, defaults from club) */}
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-gray-900">Default session schedule</h2>
          <p className="text-xs text-gray-500">
            Leave blank to inherit from the parent club. Override per pod for
            crews that meet on a different day or time.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Day"
              value={form.default_session_day}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_session_day: e.target.value as DayOfWeek | "",
                })
              }
            >
              <option value="">(inherit from club)</option>
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
            <Input
              label="Time (HH:MM)"
              type="time"
              value={form.default_session_time}
              onChange={(e) =>
                setForm({ ...form, default_session_time: e.target.value })
              }
            />
            <Input
              label="Duration (min)"
              type="number"
              min={15}
              max={480}
              value={form.default_session_duration_minutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  default_session_duration_minutes: e.target.value
                    ? Number(e.target.value)
                    : "",
                })
              }
            />
          </div>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Link href="/admin/community/pods">
            <Button variant="secondary" type="button" disabled={submitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? "Creating…" : "Create pod"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member picker (lightweight — list of buttons filtered by search)
// ---------------------------------------------------------------------------

interface MemberPickerFieldProps {
  label: string;
  required?: boolean;
  value: string;
  search: string;
  onSearchChange: (v: string) => void;
  options: { id: string; label: string; email: string | null }[];
  onPick: (id: string) => void;
  allowClear?: boolean;
}

function MemberPickerField({
  label,
  required,
  value,
  search,
  onSearchChange,
  options,
  onPick,
  allowClear,
}: MemberPickerFieldProps) {
  const selected = value ? options.find((o) => o.id === value) : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {value && selected && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <span className="font-medium text-blue-900">{selected.label}</span>
          {selected.email && (
            <span className="text-xs text-blue-700">{selected.email}</span>
          )}
          {(allowClear || !required) && (
            <button
              type="button"
              onClick={() => onPick("")}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              Change
            </button>
          )}
        </div>
      )}

      {!value && (
        <>
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {options.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white">
              {options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onPick(o.id)}
                  className="flex w-full items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-gray-50"
                >
                  <span className="font-medium">{o.label}</span>
                  {o.email && (
                    <span className="truncate text-xs text-gray-500">{o.email}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
