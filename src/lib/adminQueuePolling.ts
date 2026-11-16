/**
 * Visibility-aware sidebar refresh budget.
 *
 * Don't make periodic backend requests from background tabs and don't
 * overlap another pair of requests when a previous poll hasn't returned.
 */
export function shouldPollAdminQueues(
  visibilityState: string,
  inFlight: boolean
): boolean {
  return visibilityState === "visible" && !inFlight;
}
