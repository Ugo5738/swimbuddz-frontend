import type { ClubPlan } from "./clubOnboarding";

const DAY_MS = 24 * 60 * 60 * 1000;

export function sortClubPlans(plans: ClubPlan[]): ClubPlan[] {
  return [...plans].sort((left, right) => left.period_start.localeCompare(right.period_start));
}

export function clubQuarterLabel(plan: ClubPlan): string {
  const start = new Date(`${plan.period_start}T00:00:00Z`);
  const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${start.getUTCFullYear()}`;
}

export function areAdjacentClubPlans(previous: ClubPlan, next: ClubPlan): boolean {
  const previousEnd = new Date(`${previous.period_end}T00:00:00Z`).getTime();
  const nextStart = new Date(`${next.period_start}T00:00:00Z`).getTime();
  return nextStart - previousEnd === DAY_MS;
}

export function isPlanReachable(
  plans: ClubPlan[],
  anchorPlanId: string,
  targetPlanId: string,
): boolean {
  const sorted = sortClubPlans(plans);
  const anchorIndex = sorted.findIndex((plan) => plan.id === anchorPlanId);
  const targetIndex = sorted.findIndex((plan) => plan.id === targetPlanId);
  if (anchorIndex < 0 || targetIndex < anchorIndex) return false;

  for (let index = anchorIndex + 1; index <= targetIndex; index += 1) {
    if (!sorted[index].entry_available || !areAdjacentClubPlans(sorted[index - 1], sorted[index])) {
      return false;
    }
  }
  return true;
}

/**
 * Select a continuous run of quarters beginning with the required entry
 * quarter. Choosing a later quarter fills the quarters in between; removing a
 * quarter removes it and every later one. That makes gaps impossible in the UI
 * and mirrors the server invariant.
 */
export function toggleContiguousClubPlan(
  plans: ClubPlan[],
  selectedIds: string[],
  anchorPlanId: string,
  targetPlanId: string,
): string[] {
  if (targetPlanId === anchorPlanId) return [anchorPlanId, ...selectedIds.filter((id) => id !== anchorPlanId)];

  const sorted = sortClubPlans(plans);
  const anchorIndex = sorted.findIndex((plan) => plan.id === anchorPlanId);
  const targetIndex = sorted.findIndex((plan) => plan.id === targetPlanId);
  if (anchorIndex < 0 || targetIndex <= anchorIndex) return selectedIds;

  if (selectedIds.includes(targetPlanId)) {
    return sorted
      .slice(anchorIndex, targetIndex)
      .map((plan) => plan.id)
      .filter((id) => selectedIds.includes(id) || id === anchorPlanId);
  }

  if (!isPlanReachable(sorted, anchorPlanId, targetPlanId)) return selectedIds;
  return sorted.slice(anchorIndex, targetIndex + 1).map((plan) => plan.id);
}
