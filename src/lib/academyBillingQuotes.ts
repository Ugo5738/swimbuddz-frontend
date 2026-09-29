import type { ChargePreview } from "@/lib/clubOnboarding";

export type BillingMode = "full" | "installments";
export type AcademyBillingQuotes = {
  full: ChargePreview | null;
  installments: ChargePreview | null;
  withoutBubbles: Record<BillingMode, ChargePreview | null>;
  errors: Partial<Record<BillingMode, string>>;
};

/** Keep a server-priced zero-Bubbles fallback for instant, safe mode changes. */
export async function loadAcademyBillingQuotes(
  installmentEnabled: boolean,
  bubbles: number,
  quote: (mode: BillingMode, bubbles: number) => Promise<ChargePreview>
): Promise<AcademyBillingQuotes> {
  const result: AcademyBillingQuotes = {
    full: null, installments: null,
    withoutBubbles: { full: null, installments: null }, errors: {},
  };
  await Promise.all((["full", "installments"] as const).map(async (mode) => {
    if (mode === "installments" && !installmentEnabled) return;
    try {
      const base = await quote(mode, 0);
      result.withoutBubbles[mode] = base;
      const maximum = Math.floor((base.net_subtotal_kobo ?? base.subtotal_kobo) / 10000);
      result[mode] = bubbles > 0 && bubbles <= maximum ? await quote(mode, bubbles) : base;
    } catch (error) {
      result.errors[mode] = error instanceof Error ? error.message : "Could not load payment price";
    }
  }));
  return result;
}
