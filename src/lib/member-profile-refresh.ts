/**
 * A route change should not refetch the same full member profile every time.
 *
 * This only governs the member shell's display data. Financial and access
 * decisions are always made by the authenticated backend; explicit refetches
 * (e.g. payment callbacks and profile changes) are never throttled here.
 */
export const MEMBER_NAV_PROFILE_REFRESH_MIN_INTERVAL_MS = 60_000;

export function shouldRefreshMemberProfileOnNavigation(
  lastRequestedAt: number,
  now: number,
  minIntervalMs = MEMBER_NAV_PROFILE_REFRESH_MIN_INTERVAL_MS
): boolean {
  if (!Number.isFinite(now) || !Number.isFinite(lastRequestedAt)) return true;
  // If the system clock jumps backwards, refresh rather than trust stale data.
  if (now < lastRequestedAt) return true;
  return now - lastRequestedAt >= minIntervalMs;
}
