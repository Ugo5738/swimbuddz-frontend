import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./api";

export type SkillProficiency = "not_started" | "learning" | "confident" | "mastered";
export type SkillDomainCode =
  | "foundations"
  | "freestyle"
  | "backstroke"
  | "breaststroke"
  | "butterfly"
  | "advanced_skills";
export type VerificationSource = "self_logged" | "strokelab_ai" | "coach_verified";
export type VerificationStatus = "unverified" | "pending_review" | "verified" | "rejected";
export type VerifierRole = "coach" | "pod_lead" | "admin";
export type BenchmarkStroke =
  | "freestyle"
  | "backstroke"
  | "breaststroke"
  | "butterfly"
  | "medley"
  | "open_water"
  | "any";
export type BenchmarkType =
  | "max_distance"
  | "time_trial"
  | "spl"
  | "stroke_rate"
  | "swolf"
  | "open_water";
export type ViewerAudience =
  | "self"
  | "coach_or_admin"
  | "pod_lead"
  | "pod_mate"
  | "public_share";

export interface ScorecardSkillItem {
  skill_code: string;
  domain: SkillDomainCode;
  title: string;
  description: string;
  ti_focal_point: string;
  order_index: number;
  is_safety_gate: boolean;
  proficiency: SkillProficiency;
  verification_source: VerificationSource;
  verification_status: VerificationStatus;
  verified_proficiency: SkillProficiency | null;
  is_verified: boolean;
  is_safety_gate_cleared: boolean;
  auto_verified_via: string | null;
  verified_by_member_id: string | null;
  verified_by_name: string | null;
  verified_by_role: VerifierRole | null;
  verified_at: string | null;
  member_notes: string | null;
  verifier_notes: string | null;
  updated_at: string | null;
}

export interface ScorecardDomainSection {
  code: SkillDomainCode;
  title: string;
  short_title: string;
  description: string;
  order_index: number;
  layer: string;
  default_expanded_for_beginner: boolean;
  total_skills: number;
  started_count: number;
  confident_or_mastered_count: number;
  verified_count: number;
  pending_review_count: number;
  stroke_unlocked: boolean;
  skills: ScorecardSkillItem[];
}

export interface BenchmarkItem {
  id: string;
  member_id: string;
  stroke: BenchmarkStroke;
  benchmark_type: BenchmarkType;
  recorded_at: string;
  distance_m: number | null;
  duration_seconds: number | null;
  pace_per_100m_seconds: number | null;
  stroke_count: number | null;
  stroke_rate_spm: number | null;
  swolf_score: number | null;
  pool_length_m: number | null;
  pool_id: string | null;
  pool_name: string | null;
  session_id: string | null;
  benchmark_day_label: string | null;
  verification_source: VerificationSource;
  verification_status: VerificationStatus;
  verified_by_member_id: string | null;
  verified_by_name: string | null;
  verified_by_role: VerifierRole | null;
  verified_at: string | null;
  notes: string | null;
  verifier_notes: string | null;
  created_at: string;
}

export interface PersonalBestRecord {
  key: string;
  label: string;
  stroke: string;
  benchmark_type: string;
  value: number;
  display_value: string;
  unit: string;
  pool_length_m: number | null;
  pool_name: string | null;
  recorded_at: string;
  verification_source: VerificationSource;
  is_verified: boolean;
  benchmark_id: string | null;
}

export interface TrendPoint {
  recorded_at: string;
  value: number;
  display_value: string;
  stroke: string;
  pool_length_m: number | null;
  pool_name: string | null;
  verification_source: VerificationSource;
  label: string | null;
}

export interface BenchmarkTrendSeries {
  metric_key: string;
  title: string;
  unit: string;
  higher_is_better: boolean | null;
  points: TrendPoint[];
}

export interface StrokeLabRunSummary {
  job_id: string;
  stroke_type: string;
  completed_at: string;
  stroke_rate_spm: number | null;
  body_roll_proxy_degrees: number | null;
  breath_balance_left_ratio: number | null;
  focus_area: string | null;
  summary_text: string | null;
}

export interface StrokeLabSection {
  available: boolean;
  total_analyses: number;
  latest_stroke_rate_spm: number | null;
  latest_body_roll_degrees: number | null;
  latest_breath_balance_left_ratio: number | null;
  latest_focus_area: string | null;
  latest_summary_text: string | null;
  latest_completed_at: string | null;
  recent_runs: StrokeLabRunSummary[];
}

export interface AcademyMilestoneSummaryItem {
  milestone_name: string;
  achieved_at: string | null;
  program_name: string | null;
  cohort_name: string | null;
}

export interface AcademyProgressSection {
  available: boolean;
  milestones_achieved: number;
  milestones_in_progress: number;
  certificates_earned: number;
  cohorts_completed: number;
  active_enrollments: number;
  recent_milestones: AcademyMilestoneSummaryItem[];
}

export interface ConsistencyCommunitySection {
  available: boolean;
  volunteer_available: boolean;
  total_sessions_attended: number;
  total_pool_hours: number;
  longest_streak_weeks: number;
  current_streak_weeks: number;
  punctuality_rate: number | null;
  volunteer_hours: number;
  volunteer_tier: string | null;
  volunteer_recognition_tier: string | null;
  rides_shared: number;
  events_attended: number;
  latest_quarter_label: string | null;
}

export interface ScorecardSettings {
  pod_visibility_enabled: boolean;
  show_benchmarks_to_pod: boolean;
  directory_highlights_enabled: boolean;
  public_share_card_enabled: boolean;
  share_token: string | null;
  preferred_pool_length_m: number | null;
}

export interface ClubReadinessSnapshot {
  is_club_ready: boolean;
  outcome: string | null;
  nonstop_distance_m: number | null;
  deep_water_comfort: string | null;
  primary_technique_focus: string | null;
  first_club_milestone: string | null;
  completed_at: string | null;
}

export interface ScorecardHeadlineStats {
  total_skills: number;
  verified_skills_count: number;
  confident_or_mastered_count: number;
  pending_review_count: number;
  safety_gates_cleared: number;
  safety_gates_total: number;
  verified_strokes_unlocked: string[];
  top_distance_m: number | null;
  top_distance_stroke: string | null;
  top_distance_verified: boolean;
  best_spl: number | null;
  best_spl_pool_length_m: number | null;
  best_swolf: number | null;
  best_swolf_pool_length_m: number | null;
  latest_stroke_rate_spm: number | null;
  latest_stroke_rate_source: VerificationSource | null;
}

export interface MemberScorecard {
  member_id: string;
  member_name: string;
  first_name: string;
  profile_photo_url: string | null;
  member_since: string;
  active_programmes: string[];
  has_club_access: boolean;
  has_full_performance_access: boolean;
  viewer_audience: ViewerAudience;
  can_edit_self: boolean;
  can_verify: boolean;
  pod_name: string | null;
  club_name: string | null;
  club_readiness: ClubReadinessSnapshot;
  headline: ScorecardHeadlineStats;
  domains: ScorecardDomainSection[];
  personal_bests: PersonalBestRecord[];
  benchmarks: BenchmarkItem[];
  trends: BenchmarkTrendSeries[];
  strokelab: StrokeLabSection;
  academy: AcademyProgressSection;
  consistency: ConsistencyCommunitySection;
  settings: ScorecardSettings | null;
  source_availability: Record<string, boolean>;
}

export interface PeerScorecardHighlight {
  member_id: string;
  member_name: string;
  first_name: string;
  profile_photo_url: string | null;
  pod_visibility_enabled: boolean;
  is_club_ready: boolean;
  verified_strokes_unlocked: string[];
  verified_skills_count: number;
  total_skills: number;
  volunteer_recognition_tier: string | null;
  verified_benchmarks: PersonalBestRecord[];
}

export interface PodScorecardOverview {
  pod_id: string;
  pod_name: string;
  viewer_can_verify: boolean;
  members: PeerScorecardHighlight[];
}

export interface PublicShareScorecard {
  display_name: string;
  first_name: string;
  profile_photo_url: string | null;
  member_since: string;
  active_programmes: string[];
  is_club_ready: boolean;
  verified_strokes_unlocked: string[];
  verified_skills_count: number;
  total_skills: number;
  safety_gates_cleared: number;
  safety_gates_total: number;
  top_verified_distance_m: number | null;
  top_verified_distance_stroke: string | null;
  best_verified_spl: number | null;
  best_verified_spl_pool_length_m: number | null;
  best_verified_swolf: number | null;
  best_verified_swolf_pool_length_m: number | null;
  total_sessions_attended: number | null;
  total_pool_hours: number | null;
  volunteer_recognition_tier: string | null;
  domain_highlights: {
    code: string;
    title: string;
    verified_count: number;
    total_skills: number;
    unlocked: boolean;
  }[];
}

export interface PendingSkillReviewItem {
  progress_id: string;
  member_id: string;
  member_name: string;
  pod_name: string | null;
  skill_code: string;
  skill_title: string;
  domain: SkillDomainCode;
  is_safety_gate: boolean;
  claimed_proficiency: SkillProficiency;
  verified_proficiency: SkillProficiency | null;
  member_notes: string | null;
  updated_at: string;
}

export interface PendingBenchmarkReviewItem {
  benchmark_id: string;
  member_id: string;
  member_name: string;
  pod_name: string | null;
  stroke: BenchmarkStroke;
  benchmark_type: BenchmarkType;
  recorded_at: string;
  distance_m: number | null;
  duration_seconds: number | null;
  pace_per_100m_seconds: number | null;
  stroke_count: number | null;
  stroke_rate_spm: number | null;
  swolf_score: number | null;
  pool_length_m: number | null;
  pool_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScorecardReviewQueue {
  actor_role: VerifierRole;
  scoped_pod_ids: string[];
  pending_skills: PendingSkillReviewItem[];
  pending_benchmarks: PendingBenchmarkReviewItem[];
}

export interface ScorecardRosterMember {
  member_id: string;
  member_name: string;
  email: string | null;
  profile_photo_url: string | null;
  has_club_access: boolean;
  is_club_ready: boolean;
  pod_id: string | null;
  pod_name: string | null;
  verified_skills_count: number;
  total_skills: number;
  pending_reviews_count: number;
  verified_strokes_unlocked: string[];
  top_distance_m: number | null;
  last_benchmark_at: string | null;
}

export interface PoolOption {
  id: string;
  name: string;
  location_area?: string | null;
  pool_length_m?: number | null;
}

export interface CreateBenchmarkPayload {
  stroke: BenchmarkStroke;
  benchmark_type: BenchmarkType;
  recorded_at?: string;
  distance_m?: number;
  duration_seconds?: number;
  stroke_count?: number;
  stroke_rate_spm?: number;
  swolf_score?: number;
  pool_length_m?: number;
  pool_id?: string;
  pool_name?: string;
  session_id?: string;
  benchmark_day_label?: string;
  notes?: string;
  request_verification?: boolean;
  verifier_notes?: string;
}

export interface BatchBenchmarkEntryPayload extends CreateBenchmarkPayload {
  member_id: string;
}

export interface BatchBenchmarkDayPayload {
  benchmark_day_label: string;
  recorded_at?: string;
  session_id?: string;
  pool_id?: string;
  pool_name?: string;
  pool_length_m?: number;
  entries: BatchBenchmarkEntryPayload[];
}

// ── Labels & Formatting Helpers ───────────────────────────────────────────

export const PROFICIENCY_LABELS: Record<SkillProficiency, string> = {
  not_started: "Not started",
  learning: "Learning",
  confident: "Confident",
  mastered: "Mastered",
};

export const STROKE_LABELS: Record<BenchmarkStroke, string> = {
  freestyle: "Freestyle",
  backstroke: "Backstroke",
  breaststroke: "Breaststroke",
  butterfly: "Butterfly",
  medley: "Individual Medley",
  open_water: "Open Water",
  any: "Any Stroke",
};

export const BENCHMARK_TYPE_LABELS: Record<BenchmarkType, string> = {
  max_distance: "Max Continuous Distance",
  time_trial: "Time & Pace Trial",
  spl: "Strokes Per Length (SPL)",
  stroke_rate: "Stroke Rate (SPM)",
  swolf: "SWOLF Efficiency",
  open_water: "Open Water Swim",
};

export const CLUB_ONLY_BENCHMARK_TYPES: BenchmarkType[] = [
  "time_trial",
  "spl",
  "stroke_rate",
  "swolf",
  "open_water",
];

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds - mins * 60;
  return `${mins}:${rem.toFixed(1).padStart(4, "0")}`;
}

export function formatPacePer100m(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const mins = Math.floor(seconds / 60);
  const rem = seconds - mins * 60;
  return `${mins}:${rem.toFixed(1).padStart(4, "0")} /100m`;
}

export function computeLivePacePer100m(
  distanceM: number | undefined,
  durationSeconds: number | undefined,
): number | null {
  if (!distanceM || !durationSeconds || distanceM <= 0 || durationSeconds <= 0) return null;
  return Math.round(((durationSeconds / distanceM) * 100) * 100) / 100;
}

export function computeLiveSwolf(
  durationSeconds: number | undefined,
  strokeCount: number | undefined,
): number | null {
  if (!durationSeconds || !strokeCount || durationSeconds <= 0 || strokeCount <= 0) return null;
  return Math.round((durationSeconds + strokeCount) * 10) / 10;
}

export function formatBenchmarkSummary(b: {
  benchmark_type: BenchmarkType;
  distance_m: number | null;
  duration_seconds: number | null;
  pace_per_100m_seconds: number | null;
  stroke_count: number | null;
  stroke_rate_spm: number | null;
  swolf_score: number | null;
  pool_length_m: number | null;
}): string {
  const parts: string[] = [];
  if (b.benchmark_type === "max_distance" || b.benchmark_type === "open_water") {
    if (b.distance_m) parts.push(`${b.distance_m}m`);
    if (b.duration_seconds) parts.push(formatDurationSeconds(b.duration_seconds));
    if (b.pace_per_100m_seconds) parts.push(formatPacePer100m(b.pace_per_100m_seconds));
  } else if (b.benchmark_type === "time_trial") {
    if (b.distance_m) parts.push(`${b.distance_m}m`);
    if (b.duration_seconds) parts.push(formatDurationSeconds(b.duration_seconds));
    if (b.pace_per_100m_seconds) parts.push(`(${formatPacePer100m(b.pace_per_100m_seconds)})`);
  } else if (b.benchmark_type === "spl") {
    if (b.stroke_count) parts.push(`${b.stroke_count} SPL`);
    if (b.swolf_score) parts.push(`SWOLF ${b.swolf_score}`);
  } else if (b.benchmark_type === "swolf") {
    if (b.swolf_score) parts.push(`SWOLF ${b.swolf_score}`);
    if (b.stroke_count) parts.push(`${b.stroke_count} strokes`);
    if (b.duration_seconds) parts.push(formatDurationSeconds(b.duration_seconds));
  } else if (b.benchmark_type === "stroke_rate") {
    if (b.stroke_rate_spm) parts.push(`${b.stroke_rate_spm.toFixed(1)} SPM`);
  }
  if (b.pool_length_m) parts.push(`${b.pool_length_m}m pool`);
  return parts.join(" · ") || "Recorded";
}

// ── API Client Functions ──────────────────────────────────────────────────

export function fetchMyScorecard(): Promise<MemberScorecard> {
  return apiGet<MemberScorecard>("/api/v1/scorecards/me", { auth: true });
}

export function updateMySkill(
  skillCode: string,
  payload: {
    proficiency: SkillProficiency;
    member_notes?: string | null;
    request_verification?: boolean;
  },
): Promise<ScorecardSkillItem> {
  return apiPut<ScorecardSkillItem>(
    `/api/v1/scorecards/me/skills/${encodeURIComponent(skillCode)}`,
    payload,
    { auth: true },
  );
}

export function createMyBenchmark(payload: CreateBenchmarkPayload): Promise<BenchmarkItem> {
  return apiPost<BenchmarkItem>("/api/v1/scorecards/me/benchmarks", payload, { auth: true });
}

export function deleteMyBenchmark(benchmarkId: string): Promise<null> {
  return apiDelete<null>(`/api/v1/scorecards/me/benchmarks/${benchmarkId}`, { auth: true });
}

export function updateMyScorecardSettings(payload: {
  pod_visibility_enabled?: boolean;
  show_benchmarks_to_pod?: boolean;
  directory_highlights_enabled?: boolean;
  public_share_card_enabled?: boolean;
  preferred_pool_length_m?: number;
  rotate_share_token?: boolean;
}): Promise<ScorecardSettings> {
  return apiPatch<ScorecardSettings>("/api/v1/scorecards/me/settings", payload, { auth: true });
}

export function fetchPublicScorecard(shareToken: string): Promise<PublicShareScorecard> {
  return apiGet<PublicShareScorecard>(
    `/api/v1/scorecards/public/${encodeURIComponent(shareToken)}`,
  );
}

export function fetchMemberScorecard(
  memberId: string,
): Promise<MemberScorecard | PeerScorecardHighlight> {
  return apiGet<MemberScorecard | PeerScorecardHighlight>(
    `/api/v1/scorecards/members/${memberId}`,
    { auth: true },
  );
}

export function fetchPodScorecardOverview(podId: string): Promise<PodScorecardOverview> {
  return apiGet<PodScorecardOverview>(`/api/v1/scorecards/pod/${podId}`, { auth: true });
}

export function fetchReviewQueue(podId?: string): Promise<ScorecardReviewQueue> {
  const qs = podId ? `?pod_id=${encodeURIComponent(podId)}` : "";
  return apiGet<ScorecardReviewQueue>(`/api/v1/scorecards/review-queue${qs}`, { auth: true });
}

export function fetchScorecardRoster(params?: {
  search?: string;
  pod_id?: string;
  limit?: number;
}): Promise<ScorecardRosterMember[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.pod_id) qs.set("pod_id", params.pod_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet<ScorecardRosterMember[]>(`/api/v1/scorecards/roster${suffix}`, { auth: true });
}

export function verifyMemberSkill(
  memberId: string,
  skillCode: string,
  payload: {
    action: "verify" | "reject";
    proficiency?: SkillProficiency;
    verifier_notes?: string;
  },
): Promise<ScorecardSkillItem> {
  return apiPost<ScorecardSkillItem>(
    `/api/v1/scorecards/members/${memberId}/skills/${encodeURIComponent(skillCode)}/verify`,
    payload,
    { auth: true },
  );
}

export function recordVerifiedBenchmark(
  memberId: string,
  payload: CreateBenchmarkPayload,
): Promise<BenchmarkItem> {
  return apiPost<BenchmarkItem>(
    `/api/v1/scorecards/members/${memberId}/benchmarks`,
    payload,
    { auth: true },
  );
}

export function reviewMemberBenchmark(
  benchmarkId: string,
  payload: { action: "verify" | "reject"; verifier_notes?: string },
): Promise<BenchmarkItem> {
  return apiPost<BenchmarkItem>(
    `/api/v1/scorecards/benchmarks/${benchmarkId}/review`,
    payload,
    { auth: true },
  );
}

export function recordBatchBenchmarkDay(
  payload: BatchBenchmarkDayPayload,
): Promise<{ benchmark_day_label: string; recorded_count: number; benchmarks: BenchmarkItem[] }> {
  return apiPost("/api/v1/scorecards/benchmark-day/batch", payload, { auth: true });
}

export async function fetchPartnerPoolsForBenchmark(): Promise<PoolOption[]> {
  try {
    const res = await apiGet<{ items?: PoolOption[] } | PoolOption[]>(
      "/api/v1/pools?page=1&page_size=100",
    );
    if (Array.isArray(res)) return res;
    return res.items ?? [];
  } catch {
    return [];
  }
}
