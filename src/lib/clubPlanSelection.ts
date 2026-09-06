import type { ClubPlan } from "./clubOnboarding";

export function sortClubPlans(plans: ClubPlan[]): ClubPlan[] {
  return [...plans].sort((left, right) => left.period_start.localeCompare(right.period_start));
}

export function clubQuarterLabel(plan: ClubPlan): string {
  const start = new Date(`${plan.period_start}T00:00:00Z`);
  const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${start.getUTCFullYear()}`;
}

export function toggleIndependentClubPlan(
  selectedIds: string[],
  plan: ClubPlan,
): string[] {
  if (!plan.entry_available) return selectedIds;
  return selectedIds.includes(plan.id)
    ? selectedIds.filter((id) => id !== plan.id)
    : [...selectedIds, plan.id];
}
