type Props = {
  expiresAt?: string | null;
};

export function ClubTransitionCheckoutNotice({ expiresAt }: Props) {
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
      <p className="font-semibold">Pay per swim until {expiry}</p>
      <p className="mt-1">
        There&apos;s no quarterly Club fee to pay today. You&apos;ll pay the price shown for each
        swim when you book.
      </p>
    </div>
  );
}
