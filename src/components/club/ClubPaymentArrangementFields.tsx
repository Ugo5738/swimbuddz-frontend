import type { ClubPaymentMode } from "@/lib/clubOnboarding";

export type ClubPaymentArrangementValue = {
  approvedModes: ClubPaymentMode[];
  transitionRateNaira: string;
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
        Approved payment arrangements
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
          <span className="font-medium">Quarterly prepaid</span>
          <span className="block text-xs text-slate-500">
            The approved location-specific Club quarter is paid before attendance.
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
          <span className="font-medium">2026 per-session transition</span>
          <span className="block text-xs text-slate-500">
            Member pays the snapshotted Club rate when booking an eligible Club session.
          </span>
        </span>
      </label>
      {transitionEnabled ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-800">
            Session rate (₦)
            <input
              aria-label="Transition session rate"
              type="number"
              min="0"
              step="1"
              required
              disabled={disabled}
              value={value.transitionRateNaira}
              onChange={(event) =>
                onChange({ ...value, transitionRateNaira: event.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-800">
            Transition expiry
            <input
              aria-label="Transition expiry"
              type="date"
              required
              disabled={disabled}
              value={value.transitionExpiresAt}
              onChange={(event) =>
                onChange({ ...value, transitionExpiresAt: event.target.value })
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
            />
          </label>
        </div>
      ) : null}
    </fieldset>
  );
}
