"use client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { GuestBookingMode } from "@/lib/guestPasses";

export type GuestSettingsDraft = {
  allows_guests: boolean;
  guest_booking_mode: GuestBookingMode;
  guest_booking_closes_at: string;
  guest_reconciliation_days: number;
  guest_location_private: boolean;
};

export function GuestSessionSettingsFields({
  value,
  onChange,
}: {
  value: GuestSettingsDraft;
  onChange: (value: GuestSettingsDraft) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-cyan-100 bg-cyan-50/30 p-4">
      <legend className="px-1 font-semibold text-slate-900">Guest access</legend>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.allows_guests}
          onChange={(e) =>
            onChange({
              ...value,
              allows_guests: e.target.checked,
              guest_booking_mode: e.target.checked ? value.guest_booking_mode : "disabled",
            })
          }
        />
        Allow guests at this swim
      </label>
      <Select
        label="Guest self-booking"
        value={value.guest_booking_mode}
        onChange={(e) =>
          onChange({ ...value, guest_booking_mode: e.target.value as GuestBookingMode })
        }
        disabled={!value.allows_guests}
      >
        <option value="disabled">Disabled</option>
        <option value="public">Public guest link</option>
        <option value="member_invite">Member invitation required</option>
        <option value="approval_required">Individual admin approval required</option>
      </Select>
      <p className="text-xs text-slate-600">
        Guests attached to a member booking remain a separate option. Self-paying guests need an
        explicit guest price above; enter 0 for a free swim.
      </p>
      {value.guest_booking_mode !== "disabled" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Advance booking closes"
              type="datetime-local"
              value={value.guest_booking_closes_at}
              onChange={(e) => onChange({ ...value, guest_booking_closes_at: e.target.value })}
              hint="Leave blank to close reservations at the session start."
            />
            <Input
              label="Settlement window (days after swim)"
              type="number"
              min={0}
              max={30}
              value={value.guest_reconciliation_days}
              onChange={(e) =>
                onChange({ ...value, guest_reconciliation_days: Number(e.target.value) })
              }
              hint="0 requires an individual admin link once the swim starts."
            />
          </div>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.guest_location_private}
              onChange={(e) => onChange({ ...value, guest_location_private: e.target.checked })}
            />
            Share the exact venue only after confirmation
          </label>
          <p className="text-xs text-slate-500">
            Linked Events also apply their own visibility and venue privacy settings.
          </p>
        </>
      )}
    </fieldset>
  );
}
