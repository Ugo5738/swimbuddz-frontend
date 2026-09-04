import { describe, expect, it } from "vitest";

import { getSessionPriceDisplay } from "./sessionAccess";

describe("getSessionPriceDisplay", () => {
  it.each([
    ["club_enrollment", 0, "Included with Club", 0],
    ["club_transition", 500000, "2026 transition session price", 5000],
    ["community_dropin", 650000, "Community drop-in", 6500],
  ])("uses the server quote for %s", (accessSource, feeKobo, label, amountNaira) => {
    expect(
      getSessionPriceDisplay(
        {
          required_tier: "club",
          visible: true,
          bookable: true,
          digest_eligible: true,
          prompt_eligible: true,
          sign_in_allowed: true,
          sign_in_eligible: true,
          access_source: accessSource,
          fee_amount_kobo: feeKobo,
          price_label: label,
        },
        9000
      )
    ).toEqual({ label, amountNaira });
  });
});
