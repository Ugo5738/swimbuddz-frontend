"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";

export type TemplateAdmission = {
  guest_fee: number | null;
  community_dropin_fee: number | null;
  visiting_club_fee: number | null;
  allows_community_dropins: boolean;
  allows_visiting_club_members: boolean;
  allows_guests: boolean;
  max_guests_per_booking: number;
  guest_booking_mode: "disabled" | "public" | "member_invite" | "approval_required";
  guest_booking_cutoff_hours: number;
  guest_reconciliation_days: number;
  guest_location_private: boolean;
};
export const defaultAdmission: TemplateAdmission = {
  guest_fee: null, community_dropin_fee: null, visiting_club_fee: null,
  allows_community_dropins: false, allows_visiting_club_members: false,
  allows_guests: true, max_guests_per_booking: 4, guest_booking_mode: "disabled",
  guest_booking_cutoff_hours: 0, guest_reconciliation_days: 3, guest_location_private: false,
};

export function TemplateAdmissionFields({
  value,
  onChange,
  showClubVisitorFields = false,
}: {
  value: TemplateAdmission;
  onChange: (value: TemplateAdmission) => void;
  showClubVisitorFields?: boolean;
}) {
  const field = <K extends keyof TemplateAdmission>(key: K, next: TemplateAdmission[K]) =>
    onChange({ ...value, [key]: next });
  return <fieldset className="space-y-3 rounded-lg border p-3">
    <legend className="font-semibold">Admission and visiting Club members</legend>
    <label className="block text-sm"><input type="checkbox" checked={value.allows_guests}
      onChange={(e) => onChange({ ...value, allows_guests: e.target.checked,
        guest_booking_mode: e.target.checked ? value.guest_booking_mode : "disabled" })} /> Allow guests</label>
    <Select label="Guest booking mode" value={value.guest_booking_mode}
      disabled={!value.allows_guests}
      onChange={(e) => field("guest_booking_mode", e.target.value as TemplateAdmission["guest_booking_mode"])}
    >
      <option value="disabled">Disabled</option><option value="public">Public link</option>
      <option value="member_invite">Member invitation</option><option value="approval_required">Approval required</option>
    </Select>
    <Input label="Guest rate (₦)" type="number" min="0" step="0.01"
      required={value.guest_booking_mode !== "disabled"} value={value.guest_fee ?? ""}
      onChange={(e) => field("guest_fee", e.target.value === "" ? null : Number(e.target.value))} />
    <Input label="Maximum guests per booking" type="number" min="0" max="20"
      value={value.max_guests_per_booking} onChange={(e) => field("max_guests_per_booking", Number(e.target.value))} />
    <Input label="Guest booking closes (hours before swim)" type="number" min="0" max="720"
      value={value.guest_booking_cutoff_hours} onChange={(e) => field("guest_booking_cutoff_hours", Number(e.target.value))} />
    <Input label="Guest reconciliation window (days)" type="number" min="0" max="30"
      value={value.guest_reconciliation_days} onChange={(e) => field("guest_reconciliation_days", Number(e.target.value))} />
    <label className="block text-sm"><input type="checkbox" checked={value.guest_location_private}
      onChange={(e) => field("guest_location_private", e.target.checked)} /> Keep location private until guest booking</label>
    <label className="block text-sm"><input type="checkbox" checked={value.allows_community_dropins}
      onChange={(e) => field("allows_community_dropins", e.target.checked)} /> Allow Community drop-ins</label>
    <Input label="Community drop-in rate (₦)" type="number" min="0" step="0.01"
      required={value.allows_community_dropins} value={value.community_dropin_fee ?? ""}
      onChange={(e) => field("community_dropin_fee", e.target.value === "" ? null : Number(e.target.value))} />
    {showClubVisitorFields ? (
      <>
        <label className="block text-sm"><input type="checkbox" checked={value.allows_visiting_club_members}
          onChange={(e) => field("allows_visiting_club_members", e.target.checked)} /> Allow members from other SwimBuddz Club locations</label>
        <Input label="Visiting Club member rate (₦)" type="number" min="0" step="0.01"
          disabled={!value.allows_visiting_club_members} value={value.visiting_club_fee ?? ""}
          hint="Optional. Leave blank to use the host session's normal Club rate. Paid add-ons always charge their full session price."
          onChange={(e) => field("visiting_club_fee", e.target.value === "" ? null : Number(e.target.value))} />
      </>
    ) : null}
  </fieldset>;
}

type RepairPreview = { preview_token: string; volunteer_slots: { id: string; is_active: boolean; slots_needed: number; title_override?: string; role_title?: string }[]; ride_share_config?: unknown[]; sessions: {
  session_id: string; title: string; after: {
    location_name: string;
    guest_fee_kobo: number | null;
    community_dropin_fee_kobo: number | null;
    visiting_club_fee_kobo: number | null;
    allows_visiting_club_members: boolean;
  };
}[] };

export function TemplateOperationsSync({ templateId }: { templateId: string }) {
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<RepairPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const run = async (apply: boolean) => {
    setBusy(true); setMessage("");
    try {
      const path = `/api/v1/sessions/templates/${templateId}/sync-operations`;
      const body = { from_date: from, to_date: to, ...(apply ? { preview_token: preview?.preview_token } : {}) };
      if (apply) {
        const result = await apiPost<{ sessions_updated: number; warnings: string[] }>(path, body, { auth: true });
        setMessage(`Updated ${result.sessions_updated} sessions. ${result.warnings.join(" ")}`); setPreview(null);
      } else setPreview(await apiPost<RepairPreview>(path, body, { auth: true }));
    } catch (e) { setMessage(e instanceof Error ? e.message : "Could not sync sessions"); }
    finally { setBusy(false); }
  };
  return <section className="space-y-3 rounded-lg border p-3">
    <h4 className="font-semibold">Repair generated sessions</h4>
    <p className="text-sm text-slate-600">Uses saved template settings. Save your changes first, then preview venue, admission, volunteer and transport sync. Session prices and dates stay intact.</p>
    <Input label="Repair from" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreview(null); }} />
    <Input label="Repair through" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPreview(null); }} />
    <Button type="button" disabled={busy || !from || !to} onClick={() => run(false)}>Preview repair</Button>
    {preview && <div className="space-y-2 text-sm">
      <p>Volunteer needs per swim: {preview.volunteer_slots.filter((slot) => slot.is_active).map((slot) => `${slot.title_override || slot.role_title || "Volunteer"} × ${slot.slots_needed}`).join(", ") || "None configured"}. Transport routes: {preview.ride_share_config?.length ?? 0} (existing routes preserved).</p>
      {preview.sessions.map((s) => <p key={s.session_id}>{s.title} · {s.after.location_name} · Guest {s.after.guest_fee_kobo === null ? "not set" : `₦${s.after.guest_fee_kobo / 100}`} · Community {s.after.community_dropin_fee_kobo === null ? "not set" : `₦${s.after.community_dropin_fee_kobo / 100}`} · Visitors {s.after.allows_visiting_club_members ? (s.after.visiting_club_fee_kobo === null ? "host Club rate" : `₦${s.after.visiting_club_fee_kobo / 100}`) : "closed"}</p>)}
      <Button type="button" disabled={busy || !preview.sessions.length} onClick={() => run(true)}>Apply to {preview.sessions.length} sessions</Button>
    </div>}
    {message && <Alert>{message}</Alert>}
  </section>;
}
