type Mode = "plan_included" | "active_club" | "paid_addon";

export function ClubAccessModeHint({ mode }: { mode: Mode }) {
  const descriptions: Record<Mode, string> = {
    plan_included:
      "The regular practice sold as part of a Club quarter. The default SwimBuddz Club product is one included practice each week. Prepaid members are automatically reserved into future included swims and can cancel individual attendance without a quarter refund; transition members pay the session price. Select multiple included series only when the quarter genuinely includes more than one regular practice per week.",
    active_club:
      "Optional additional practice outside the quarter’s scheduled inclusion. Active prepaid Club members at this home location pay ₦0; transition members pay the session price. This does not add the practice to the purchased quarter.",
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
