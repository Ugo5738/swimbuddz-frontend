type Mode = "plan_included" | "active_club" | "paid_addon";

export function ClubAccessModeHint({ mode }: { mode: Mode }) {
  const descriptions: Record<Mode, string> = {
    plan_included:
      "A scheduled swim sold as part of a Club quarter. Use Generate Club quarter to include it in the plan. Members who prepaid that inclusion pay ₦0 when booking; transition members pay the session price.",
    active_club:
      "Extra practice outside the quarter’s scheduled inclusions. Active prepaid Club members at this location pay ₦0; transition members pay the session price. This does not add a session to the purchased quarter.",
    paid_addon:
      "A separately charged swim outside the quarter. Active prepaid and transition Club members both pay the session price. Use this for September swims that everyone should pay for individually.",
  };
  return (
    <p className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-950">
      {descriptions[mode]} Club access must cover the swim’s date and location. A future-quarter
      purchase does not unlock September. Community drop-ins and guests follow their separate
      settings.
    </p>
  );
}
