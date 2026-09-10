import type { ClubPaymentMode } from "@/lib/clubOnboarding";

export type ClubPaymentArrangementValue = {
  approvedModes: ClubPaymentMode[];
  transitionExpiresAt: string;
};

type Props = {
  value: ClubPaymentArrangementValue;
  disabled?: boolean;
  onChange: (value: ClubPaymentArrangementValue) => void;
};

export function ClubPaymentArrangementFields({ value, disabled = false, onChange }: Props) {
  const transitionEnabled = value.approvedModes.includes("transition_per_session");

  const toggleMode = (mode: ClubPaymentMode, checked: boolean) => {
    const approvedModes = checked
      ? [...new Set([...value.approvedModes, mode])]
      : value.approvedModes.filter((item) => item !== mode);
    onChange({ ...value, approvedModes });
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        How this member can join Club
      </legend>
      <p className="text-xs text-slate-600">
        These options apply only to this application. The 2026 transition option never becomes a
        global Club default.
      </p>
      <label className="flex items-start gap-3 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={value.approvedModes.includes("quarterly_prepaid")}
          disabled={disabled}
          onChange={(event) => toggleMode("quarterly_prepaid", event.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Pay for the quarter</span>
          <span className="block text-xs text-slate-500">
            The member pays for their Club quarter before attending.
          </span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={transitionEnabled}
          disabled={disabled}
          onChange={(event) => toggleMode("transition_per_session", event.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Pay per swim</span>
          <span className="block text-xs text-slate-500">
            Member pays each eligible session&apos;s current Admin-set price when booking.
          </span>
        </span>
      </label>
      {transitionEnabled ? (
        <label className="block space-y-1 text-sm font-medium text-slate-800">
          Pay-per-swim access ends
          <input
            aria-label="Pay-per-swim access ends"
            type="date"
            required
            disabled={disabled}
            value={value.transitionExpiresAt}
            onChange={(event) => onChange({ ...value, transitionExpiresAt: event.target.value })}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal sm:max-w-xs"
          />
          <span className="block text-xs font-normal text-slate-500">
            Session prices are configured on each Club session, not on this application.
          </span>
        </label>
      ) : null}
    </fieldset>
  );
}
