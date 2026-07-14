import type { DisplayMembershipTier, MembershipTier } from "@/lib/tiers";

export type SessionAccessTier = DisplayMembershipTier;

export type SessionAccessDecision = {
  required_tier: MembershipTier;
  visible: boolean;
  bookable: boolean;
  digest_eligible: boolean;
  prompt_eligible: boolean;
  sign_in_allowed: boolean;
  sign_in_eligible: boolean;
  reason?: string | null;
  message?: string | null;
};

export function tierDisplayLabel(tier: SessionAccessTier): string {
  if (tier === "prospect") return "Prospect";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
