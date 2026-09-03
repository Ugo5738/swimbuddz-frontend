type Props = {
  sessionRateKobo?: number | null;
  expiresAt?: string | null;
};

export function ClubTransitionCheckoutNotice({ sessionRateKobo, expiresAt }: Props) {
  const expiry = expiresAt
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${expiresAt}T00:00:00Z`))
    : "the approved expiry";

  return (
    <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950">
      <p className="font-semibold">2026 Club Transition — Pay Per Session</p>
      <p className="mt-1">
        No quarterly Club fee. Club sessions are ₦
        {((sessionRateKobo ?? 0) / 100).toLocaleString()} when booked.
      </p>
      <p className="mt-1">Transition ends {expiry}. Quarterly Club enrollment is standard from 2027.</p>
    </div>
  );
}
