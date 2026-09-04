import { describe, expect, it } from "vitest";

import { buildGuestPassSharePath } from "./guestPasses";

describe("guest pass share links", () => {
  it("builds an independent guest self-payment path", () => {
    expect(buildGuestPassSharePath("session-123")).toBe(
      "/guest-pass/session/session-123",
    );
  });

  it("normalizes and safely encodes referral attribution", () => {
    expect(buildGuestPassSharePath("session/123", " peter 10 ")).toBe(
      "/guest-pass/session/session%2F123?ref=PETER%2010",
    );
  });
});
