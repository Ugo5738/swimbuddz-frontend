import { apiGet, apiPost } from "./api";

// ---------------------------------------------------------------------------
// Types matching the backend AssessmentResponse / AssessmentStatsResponse
// ---------------------------------------------------------------------------

export type AssessmentApiResponse = {
  id: string;
  total_score: number;
  raw_score: number;
  level: string;
  dimension_scores: Array<{
    dimension: string;
    label: string;
    icon: string;
    score: number;
    maxScore: number;
    percentage: number;
    rating: string;
  }>;
  created_at: string;
  member_id: string | null;
};

export type AssessmentStatsApiResponse = {
  total_count: number;
  level_distribution: Record<string, number>;
  average_score: number;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Submit a completed assessment. Returns the persisted result with an id. */
export async function submitAssessment(
  answers: Record<string, number>
): Promise<AssessmentApiResponse> {
  return apiPost<AssessmentApiResponse>("/api/v1/assessments", { answers });
}

/** Fetch a single assessment by its UUID. */
export async function getAssessmentResult(id: string): Promise<AssessmentApiResponse> {
  return apiGet<AssessmentApiResponse>(`/api/v1/assessments/${id}`);
}

/** Fetch aggregate stats (total count, level distribution). */
export async function getAssessmentStats(): Promise<AssessmentStatsApiResponse> {
  return apiGet<AssessmentStatsApiResponse>("/api/v1/assessments/stats");
}
