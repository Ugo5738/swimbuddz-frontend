import { describe, expect, it } from "vitest";
import {
  MEMBER_NAV_PROFILE_REFRESH_MIN_INTERVAL_MS,
  shouldRefreshMemberProfileOnNavigation,
} from "./member-profile-refresh";

describe("member shell profile refresh budget", () => {
  it("avoids an immediate duplicate profile query after initial mount", () => {
    expect(shouldRefreshMemberProfileOnNavigation(1000, 1001)).toBe(false);
  });

  it("does not refetch during rapid navigation", () => {
    expect(shouldRefreshMemberProfileOnNavigation(1000, 1000 + 30_000)).toBe(false);
  });

  it("revalidates on a later navigation after the bounded freshness window", () => {
    expect(
      shouldRefreshMemberProfileOnNavigation(
        1000,
        1000 + MEMBER_NAV_PROFILE_REFRESH_MIN_INTERVAL_MS
      )
    ).toBe(true);
  });

  it("revalidates on a system clock jump rather than silently freezing profile", () => {
    expect(shouldRefreshMemberProfileOnNavigation(10_000, 9_000)).toBe(true);
  });

  it("does not depend on navigation count; explicit mutations can still refetch", () => {
    expect(shouldRefreshMemberProfileOnNavigation(0, 59_999)).toBe(false);
    expect(shouldRefreshMemberProfileOnNavigation(0, 60_000)).toBe(true);
  });
});
