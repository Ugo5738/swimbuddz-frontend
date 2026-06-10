"use client";

import { Card } from "@/components/ui/Card";
import { UserPlus, X } from "lucide-react";

// Frontend guest shape (camelCase). Mapped to the backend BookingGuestCreate
// (snake_case) at submit time in the booking page.
export interface GuestInfo {
  name: string;
  phone: string;
  dob: string; // YYYY-MM-DD ("" = not provided)
  guardianName: string;
  guardianPhone: string;
  waiverAccepted: boolean;
}

export const emptyGuest = (): GuestInfo => ({
  name: "",
  phone: "",
  dob: "",
  guardianName: "",
  guardianPhone: "",
  waiverAccepted: false,
});

/** Under 18 as of `refIso` (the session date when known, else today). */
export function isGuestMinor(dob: string, refIso?: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return false;
  const ref = refIso ? new Date(refIso) : new Date();
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return age < 18;
}

/** Mirrors the server-side guest policy so the Pay button can gate early. */
export function guestIsValid(g: GuestInfo, refIso?: string): boolean {
  if (!g.name.trim()) return false;
  if (isGuestMinor(g.dob, refIso)) {
    return Boolean(g.guardianName.trim() && g.guardianPhone.trim() && g.waiverAccepted);
  }
  return true;
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-cyan-400 focus:border-transparent placeholder:text-slate-400";

export function GuestsForm({
  guests,
  onChange,
  maxGuests = 4,
  sessionStartsAt,
  perHeadFee,
  formatCurrency,
}: {
  guests: GuestInfo[];
  onChange: (guests: GuestInfo[]) => void;
  maxGuests?: number;
  sessionStartsAt?: string;
  perHeadFee: number;
  formatCurrency: (n: number) => string;
}) {
  const update = (i: number, patch: Partial<GuestInfo>) =>
    onChange(guests.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  const remove = (i: number) => onChange(guests.filter((_, idx) => idx !== i));
  const add = () => onChange([...guests, emptyGuest()]);

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Bringing a friend?</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Add guests to your booking. Each guest pays the {formatCurrency(perHeadFee)} session fee.
        </p>
      </div>

      {guests.map((g, i) => {
        const minor = isGuestMinor(g.dob, sessionStartsAt);
        return (
          <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Guest {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                aria-label={`Remove guest ${i + 1}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              className={inputCls}
              placeholder="Full name"
              value={g.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                className={inputCls}
                placeholder="Phone (optional)"
                value={g.phone}
                onChange={(e) => update(i, { phone: e.target.value })}
              />
              <input
                className={inputCls}
                type="date"
                aria-label="Date of birth (optional)"
                value={g.dob}
                onChange={(e) => update(i, { dob: e.target.value })}
              />
            </div>

            {minor && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2.5">
                <p className="text-xs font-medium text-amber-700">
                  Under 18 — a guardian and a signed waiver are required.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className={inputCls}
                    placeholder="Guardian name"
                    value={g.guardianName}
                    onChange={(e) => update(i, { guardianName: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="Guardian phone"
                    value={g.guardianPhone}
                    onChange={(e) => update(i, { guardianPhone: e.target.value })}
                  />
                </div>
                <label className="flex items-start gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={g.waiverAccepted}
                    onChange={(e) => update(i, { waiverAccepted: e.target.checked })}
                  />
                  I confirm a guardian has signed a liability waiver for this guest.
                </label>
              </div>
            )}
          </div>
        );
      })}

      {guests.length < maxGuests ? (
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add {guests.length === 0 ? "a guest" : "another guest"}
        </button>
      ) : (
        <p className="text-xs text-slate-400">Up to {maxGuests} guests per booking.</p>
      )}
    </Card>
  );
}
