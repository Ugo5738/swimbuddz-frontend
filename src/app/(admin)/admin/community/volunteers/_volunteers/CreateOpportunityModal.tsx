"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { VolunteerRole } from "@/lib/volunteers";

export type OppForm = {
  title: string;
  description: string;
  role_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  slots_needed: string;
  opportunity_type: "open_claim" | "approval_required";
  min_tier: "tier_1" | "tier_2" | "tier_3";
  qr_checkin_enabled: boolean;
  attach_mode: "standalone" | "session" | "event";
  session_id: string;
  event_id: string;
};

type SessionLookup = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_name?: string | null;
};

type EventLookup = {
  id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  location?: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  oppForm: OppForm;
  setOppForm: React.Dispatch<React.SetStateAction<OppForm>>;
  roles: VolunteerRole[];
  attachSessions: SessionLookup[];
  attachEvents: EventLookup[];
  attachLoading: boolean;
  ensureAttachLookups: (mode: "session" | "event") => Promise<void>;
  onAttachSelect: (id: string) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function CreateOpportunityModal({
  isOpen,
  onClose,
  oppForm,
  setOppForm,
  roles,
  attachSessions,
  attachEvents,
  attachLoading,
  ensureAttachLookups,
  onAttachSelect,
  onSubmit,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Volunteer Opportunity">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label="Title"
          value={oppForm.title}
          onChange={(e) => setOppForm({ ...oppForm, title: e.target.value })}
          required
          placeholder="e.g., Saturday Session Volunteers"
        />
        <Textarea
          label="Description"
          value={oppForm.description}
          onChange={(e) => setOppForm({ ...oppForm, description: e.target.value })}
          rows={2}
          placeholder="Optional details..."
        />

        {/* Attach-to picker — tie this opportunity to a session/event
            so it surfaces on the corresponding booking/RSVP page. */}
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
          <Select
            label="Attach to"
            value={oppForm.attach_mode}
            onChange={async (e) => {
              const mode = e.target.value as "standalone" | "session" | "event";
              setOppForm({
                ...oppForm,
                attach_mode: mode,
                session_id: "",
                event_id: "",
              });
              if (mode !== "standalone") {
                await ensureAttachLookups(mode);
              }
            }}
          >
            <option value="standalone">Standalone (no link)</option>
            <option value="session">Session</option>
            <option value="event">Event</option>
          </Select>
          {oppForm.attach_mode === "session" && (
            <Select
              label="Session"
              value={oppForm.session_id}
              onChange={(e) => onAttachSelect(e.target.value)}
            >
              <option value="">
                {attachLoading ? "Loading sessions…" : "— Select session —"}
              </option>
              {attachSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {new Date(s.starts_at).toLocaleString("en-NG", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {s.title}
                </option>
              ))}
            </Select>
          )}
          {oppForm.attach_mode === "event" && (
            <Select
              label="Event"
              value={oppForm.event_id}
              onChange={(e) => onAttachSelect(e.target.value)}
            >
              <option value="">
                {attachLoading ? "Loading events…" : "— Select event —"}
              </option>
              {attachEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {new Date(ev.start_time).toLocaleString("en-NG", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {ev.title}
                </option>
              ))}
            </Select>
          )}
          {oppForm.attach_mode !== "standalone" && (
            <p className="text-xs text-slate-500">
              Date, time, and location below are pre-filled from the selected{" "}
              {oppForm.attach_mode === "session" ? "session" : "event"} but remain editable.
            </p>
          )}
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Select
            label="Role"
            value={oppForm.role_id}
            onChange={(e) => setOppForm({ ...oppForm, role_id: e.target.value })}
          >
            <option value="">Any role</option>
            {roles
              .filter((r) => r.is_active)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.icon} {r.title}
                </option>
              ))}
          </Select>
          <Input
            label="Slots Needed"
            type="number"
            min={1}
            value={oppForm.slots_needed}
            onChange={(e) => setOppForm({ ...oppForm, slots_needed: e.target.value })}
            required
          />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            value={oppForm.date}
            onChange={(e) => setOppForm({ ...oppForm, date: e.target.value })}
            required
          />
          <Input
            label="Location"
            value={oppForm.location_name}
            onChange={(e) => setOppForm({ ...oppForm, location_name: e.target.value })}
            placeholder="e.g., Yaba Pool"
          />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Input
            label="Start Time"
            type="time"
            value={oppForm.start_time}
            onChange={(e) => setOppForm({ ...oppForm, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={oppForm.end_time}
            onChange={(e) => setOppForm({ ...oppForm, end_time: e.target.value })}
          />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Settings</h4>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <Select
              label="Claim Type"
              value={oppForm.opportunity_type}
              onChange={(e) =>
                setOppForm({
                  ...oppForm,
                  opportunity_type: e.target.value as "open_claim" | "approval_required",
                })
              }
            >
              <option value="open_claim">Open (anyone can claim)</option>
              <option value="approval_required">Approval required</option>
            </Select>
            <Select
              label="Minimum Tier"
              value={oppForm.min_tier}
              onChange={(e) =>
                setOppForm({
                  ...oppForm,
                  min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
                })
              }
            >
              <option value="tier_1">Tier 1 — Anyone</option>
              <option value="tier_2">Tier 2 — Core</option>
              <option value="tier_3">Tier 3 — Lead</option>
            </Select>
          </div>
          <label className="flex items-center gap-3 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={oppForm.qr_checkin_enabled}
              onChange={(e) =>
                setOppForm({ ...oppForm, qr_checkin_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-700">Enable QR Check-in</span>
              <p className="text-xs text-slate-500">
                Volunteers scan a QR code at the pool to self check-in
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create as Draft</Button>
        </div>
      </form>
    </Modal>
  );
}
