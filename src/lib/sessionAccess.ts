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
  access_source?: string | null;
  fee_amount_kobo?: number | null;
  price_label?: string | null;
};

export function getSessionPriceDisplay(
  access: SessionAccessDecision | null | undefined,
  fallbackNaira: number
): { label: string; amountNaira: number } {
  return {
    label: access?.price_label || "Session price",
    amountNaira:
      access?.fee_amount_kobo == null ? fallbackNaira : access.fee_amount_kobo / 100,
  };
}

export function tierDisplayLabel(tier: SessionAccessTier): string {
  if (tier === "prospect") return "Prospect";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
