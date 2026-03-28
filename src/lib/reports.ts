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
