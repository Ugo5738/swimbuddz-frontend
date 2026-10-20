import { describe, expect, it } from "vitest";
import { sessionDiscoveryUrl } from "../swim-ia-routes";

describe("Sessions Hub legacy route compatibility", () => {
  it("sends discovery to Find a Swim", () => {
    expect(sessionDiscoveryUrl(new URLSearchParams())).toBe("/find-a-swim/sessions");
    expect(sessionDiscoveryUrl(new URLSearchParams("view=all&types=club"))).toBe(
      "/find-a-swim/sessions?view=all&types=club"
    );
  });
  it("keeps old booked and past bookmarks working", () => {
    expect(sessionDiscoveryUrl(new URLSearchParams("view=my"))).toBe("/account/bookings?view=upcoming");
    expect(sessionDiscoveryUrl(new URLSearchParams("view=booked"))).toBe("/account/bookings?view=upcoming");
    expect(sessionDiscoveryUrl(new URLSearchParams("view=past"))).toBe("/account/bookings?view=history");
  });
});
