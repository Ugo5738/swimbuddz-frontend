export type SwimProgress = {
  total_swims: number;
  active_weeks: number;
  streak_weeks: number;
  week_days: number;
  weekly_limit: number;
  today_counted: boolean;
  bubbles_earned: number;
  bubbles_credited: number;
  reward_value_naira: number;
  programme_start_date?: string;
  all_time_swims?: number;
  all_time_active_weeks?: number;
  all_time_best_streak?: number;
  all_time_current_streak?: number;
  all_time_available?: boolean;
};

export type WalletBalanceSnapshot = {
  balance: number;
  available_balance?: number;
};

export type SwimRewardsVariant = "dashboard" | "strip" | "hub";

export const NAIRA_PER_BUBBLE = 100;
export const swimNumberFormat = new Intl.NumberFormat("en-NG");

export const SWIM_MILESTONES = [
  { swims: 1, label: "First swim" },
  { swims: 10, label: "10 swims" },
  { swims: 50, label: "50 swims" },
  { swims: 100, label: "100 swims" },
];

export function getAllTimeSwims(data: SwimProgress): number {
  return Math.max(data.all_time_swims ?? 0, data.total_swims);
}

export function getAllTimeActiveWeeks(data: SwimProgress): number {
  return Math.max(data.all_time_active_weeks ?? 0, data.active_weeks);
}

export function getAllTimeBestStreak(data: SwimProgress): number {
  return Math.max(data.all_time_best_streak ?? 0, data.streak_weeks);
}

export function getNextSwimRewardCue(data: SwimProgress | null): string | null {
  if (!data) return null;
  if (data.week_days >= data.weekly_limit) {
    return "Weekly 3-day Bubble cap reached";
  }
  if (data.today_counted) {
    return "Today’s swim counted · Swim another day for +1 🫧";
  }
  if (data.bubbles_credited > data.bubbles_earned) {
    return "Next swim offsets a prior attendance adjustment";
  }
  if (data.week_days > 0) {
    return `+1 🫧 after swim (${data.week_days + 1} of ${data.weekly_limit} this week)`;
  }
  return "+1 🫧 automatically after swim";
}

export function getNextRewardMessage(data: SwimProgress): string {
  if (data.week_days >= data.weekly_limit) {
    return "You’ve reached this week’s 3-day limit. You can earn again on Monday.";
  }
  if (data.today_counted) {
    return "Today’s swim counts. Swim on another day this week to earn your next Bubble.";
  }
  if (data.bubbles_credited > data.bubbles_earned) {
    return "Your next qualifying swim counts toward a Bubble already spent before an attendance update.";
  }
  if (data.week_days > 0) {
    const remaining = data.weekly_limit - data.week_days;
    return `${data.week_days} reward ${data.week_days === 1 ? "day" : "days"} earned this week — ${remaining} more swim ${remaining === 1 ? "day" : "days"} before Sunday earns up to ${remaining} more ${remaining === 1 ? "Bubble" : "Bubbles"}.`;
  }
  return "After your next eligible swim ends, you earn 1 Bubble automatically.";
}
