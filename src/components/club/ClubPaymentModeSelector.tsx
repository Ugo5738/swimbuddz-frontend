import type { ClubPaymentMode } from "@/lib/clubOnboarding";

const COPY: Record<ClubPaymentMode, { title: string; detail: string }> = {
  quarterly_prepaid: {
    title: "Quarterly prepaid",
    detail: "Pay the approved Club quarter now; included Club sessions show ₦0 at booking.",
  },
  transition_per_session: {
    title: "2026 per-session transition",
    detail: "No quarterly Club charge. Pay each Club session's current price when you book.",
  },
};

type Props = {
  approvedModes: ClubPaymentMode[];
  value: ClubPaymentMode;
  transitionExpiresAt?: string | null;
  onChange: (mode: ClubPaymentMode) => void;
};

export function ClubPaymentModeSelector({
  approvedModes,
  value,
  transitionExpiresAt,
  onChange,
}: Props) {
  if (approvedModes.length === 1) {
    const mode = approvedModes[0];
    return (
      <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 text-sm">
        <p className="font-semibold text-slate-900">{COPY[mode].title}</p>
        <p className="text-slate-600">{COPY[mode].detail}</p>
        {mode === "transition_per_session" && transitionExpiresAt ? (
          <p className="mt-1 text-xs font-medium text-cyan-800">
            Active through {transitionExpiresAt}
          </p>
        ) : null}
      </div>
    );
  }

  if (approvedModes.length === 0) return null;

  return (
    <fieldset className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Choose how to pay for Club</legend>
      {approvedModes.map((mode) => {
        const selected = value === mode;
        return (
          <label
            key={mode}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-white p-3 ${
              selected ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name="club-payment-mode"
              value={mode}
              checked={selected}
              onChange={() => onChange(mode)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-semibold text-slate-900">{COPY[mode].title}</span>
              <span className="block text-slate-600">{COPY[mode].detail}</span>
              {mode === "transition_per_session" && transitionExpiresAt ? (
                <span className="mt-1 block text-xs font-medium text-cyan-800">
                  Active through {transitionExpiresAt}
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
