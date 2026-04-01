import { apiGet, apiPut } from "./api";
import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

// ── Types ──

export type MemberQuarterlyReport = {
  id: string;
  member_id: string;
  year: number;
  quarter: number;
  member_name: string;
  member_tier: string | null;

  // Attendance
  total_sessions_attended: number;
  total_sessions_available: number;
  attendance_rate: number;
  sessions_by_type: Record<string, number> | null;
  punctuality_rate: number;
  streak_longest: number;
  streak_current: number;
  favorite_day: string | null;
  favorite_location: string | null;

  // Academy
  milestones_achieved: number;
  milestones_in_progress: number;
  programs_enrolled: number;
  certificates_earned: number;

  // Financial
  total_spent_ngn: number;
  bubbles_earned: number;
  bubbles_spent: number;

  // Transport
  rides_taken: number;
  rides_offered: number;

  // Volunteer
  volunteer_hours: number;

  // Store
  orders_placed: number;
  store_spent_ngn: number;

  // Events
  events_attended: number;

  // Pool time
  pool_hours: number;

  // First-timer
  is_first_quarter: boolean;
  member_joined_at: string | null;

  // Percentile
  attendance_percentile: number;

  // Academy detail
  academy_skills: string[] | null;
  cohorts_completed: number;

  // Privacy
  leaderboard_opt_out: boolean;

  // Card
  card_image_path: string | null;

  // Timestamps
  computed_at: string;
};

export type QuarterlyReportSummary = {
  year: number;
  quarter: number;
  label: string;
  status: string;
  computed_at: string | null;
};

export type LeaderboardEntry = {
  rank: number;
  member_id: string;
  member_name: string;
  value: number;
  is_current_user: boolean;
};

export type LeaderboardResponse = {
  category: string;
  year: number;
  quarter: number;
  entries: LeaderboardEntry[];
};

// ── API Functions ──

export async function fetchQuarterlyReport(
  year: number,
  quarter: number
): Promise<MemberQuarterlyReport> {
  return apiGet<MemberQuarterlyReport>(
    `/api/v1/reports/me/quarterly?year=${year}&quarter=${quarter}`,
    { auth: true }
  );
}

export async function fetchAvailableQuarters(): Promise<QuarterlyReportSummary[]> {
  return apiGet<QuarterlyReportSummary[]>("/api/v1/reports/quarterly/available", { auth: true });
}

export async function toggleLeaderboardPrivacy(
  year: number,
  quarter: number,
  optOut: boolean
): Promise<void> {
  await apiPut(
    "/api/v1/reports/me/quarterly/privacy",
    {
      year,
      quarter,
      leaderboard_opt_out: optOut,
    },
    { auth: true }
  );
}

export function getCardImageUrl(
  year: number,
  quarter: number,
  format: "square" | "story" = "square"
): string {
  return `${API_BASE_URL}/api/v1/reports/me/quarterly/card?year=${year}&quarter=${quarter}&format=${format}`;
}

export async function downloadCardImage(
  year: number,
  quarter: number,
  format: "square" | "story" = "square"
): Promise<Blob> {
  const token = await getCurrentAccessToken();
  const url = getCardImageUrl(year, quarter, format);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to download card image");
  return response.blob();
}

export async function downloadPdfReport(year: number, quarter: number): Promise<void> {
  const token = await getCurrentAccessToken();
  const url = `${API_BASE_URL}/api/v1/reports/me/quarterly/pdf?year=${year}&quarter=${quarter}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to download PDF report");
  const blob = await response.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `swimbuddz-Q${quarter}-${year}-report.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function quarterLabel(year: number, quarter: number): string {
  return `Q${quarter} ${year}`;
}

export function quarterSlug(year: number, quarter: number): string {
  return `q${quarter}-${year}`;
}

export function parseQuarterSlug(slug: string): {
  year: number;
  quarter: number;
} | null {
  const match = slug.match(/^q(\d)-(\d{4})$/);
  if (!match) return null;
  return { quarter: parseInt(match[1]), year: parseInt(match[2]) };
}

// ── YTD Aggregation ──

export type YTDStats = {
  total_sessions_attended: number;
  total_sessions_available: number;
  attendance_rate: number;
  pool_hours: number;
  streak_current: number;
  streak_longest: number;
  bubbles_earned: number;
  bubbles_spent: number;
  total_spent_ngn: number;
  milestones_achieved: number;
  programs_enrolled: number;
  certificates_earned: number;
  rides_taken: number;
  rides_offered: number;
  volunteer_hours: number;
  orders_placed: number;
  store_spent_ngn: number;
  events_attended: number;
  attendance_percentile: number;
  favorite_day: string | null;
  favorite_location: string | null;
  quarters_loaded: number;
};

const EMPTY_YTD: YTDStats = {
  total_sessions_attended: 0,
  total_sessions_available: 0,
  attendance_rate: 0,
  pool_hours: 0,
  streak_current: 0,
  streak_longest: 0,
  bubbles_earned: 0,
  bubbles_spent: 0,
  total_spent_ngn: 0,
  milestones_achieved: 0,
  programs_enrolled: 0,
  certificates_earned: 0,
  rides_taken: 0,
  rides_offered: 0,
  volunteer_hours: 0,
  orders_placed: 0,
  store_spent_ngn: 0,
  events_attended: 0,
  attendance_percentile: 0,
  favorite_day: null,
  favorite_location: null,
  quarters_loaded: 0,
};

export async function fetchYTDStats(year: number): Promise<YTDStats> {
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const promises = Array.from({ length: currentQuarter }, (_, i) =>
    fetchQuarterlyReport(year, i + 1)
  );
  const results = await Promise.allSettled(promises);
  const reports = results
    .filter((r): r is PromiseFulfilledResult<MemberQuarterlyReport> => r.status === "fulfilled")
    .map((r) => r.value);

  if (reports.length === 0) return { ...EMPTY_YTD };

  const summed = reports.reduce(
    (acc, r) => {
      acc.total_sessions_attended += r.total_sessions_attended;
      acc.total_sessions_available += r.total_sessions_available;
      acc.pool_hours += r.pool_hours;
      acc.bubbles_earned += r.bubbles_earned;
      acc.bubbles_spent += r.bubbles_spent;
      acc.total_spent_ngn += r.total_spent_ngn;
      acc.milestones_achieved += r.milestones_achieved;
      acc.programs_enrolled += r.programs_enrolled;
      acc.certificates_earned += r.certificates_earned;
      acc.rides_taken += r.rides_taken;
      acc.rides_offered += r.rides_offered;
      acc.volunteer_hours += r.volunteer_hours;
      acc.orders_placed += r.orders_placed;
      acc.store_spent_ngn += r.store_spent_ngn;
      acc.events_attended += r.events_attended;
      acc.streak_longest = Math.max(acc.streak_longest, r.streak_longest);
      return acc;
    },
    { ...EMPTY_YTD }
  );

  // Use the latest quarter that has actual data (not an empty Q2 at start of quarter)
  const reportsWithData = reports.filter((r) => r.total_sessions_attended > 0);
  const latest =
    reportsWithData.length > 0
      ? reportsWithData[reportsWithData.length - 1]
      : reports[reports.length - 1];
  summed.streak_current = latest.streak_current;
  summed.attendance_percentile = latest.attendance_percentile;
  summed.favorite_day = latest.favorite_day;
  summed.favorite_location = latest.favorite_location;

  // Weighted attendance rate
  summed.attendance_rate =
    summed.total_sessions_available > 0
      ? summed.total_sessions_attended / summed.total_sessions_available
      : 0;

  summed.quarters_loaded = reports.length;
  return summed;
}
