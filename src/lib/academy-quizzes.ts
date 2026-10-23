import { apiGet, apiPost, apiPut } from "@/lib/api";

export type QuizOption = { id: string; text: string };
export type QuizQuestion = { id: string; text: string; kind: "single" | "multiple" | "true_false"; options: QuizOption[]; correct_option_ids: string[]; explanation: string };
export type QuizTemplate = { id: string; program_id: string; title: string; description: string | null; questions: QuizQuestion[]; version: number };
export type QuizAssignmentInput = { quiz_id: string; week_number: number; passing_score: number; max_attempts: number | null; required: boolean };
export type QuizAssignment = QuizAssignmentInput & { id: string; cohort_id: string; title: string; version: number };
export type QuizFeedback = { question_id: string; correct: boolean; correct_option_ids: string[]; explanation: string };
export type QuizResult = { attempt_number: number; score_percent: number; passed: boolean; feedback: QuizFeedback[]; submitted_at: string };
export type LearnerQuiz = QuizAssignment & { available_at: string; is_unlocked: boolean; passed: boolean; attempts_used: number; attempts_remaining: number | null; questions: Omit<QuizQuestion, "correct_option_ids" | "explanation">[] | null; latest_result: QuizResult | null };
export type KnowledgeCompletion = { required_total: number; required_passed: number; knowledge_complete: boolean };

const admin = { auth: true } as const;

export const AcademyQuizApi = {
  listTemplates: (programId: string) => apiGet<QuizTemplate[]>(`/api/v1/academy/admin/programs/${programId}/quizzes`, admin),
  createTemplate: (payload: Omit<QuizTemplate, "id" | "version">) => apiPost<QuizTemplate>("/api/v1/academy/admin/quizzes", payload, admin),
  updateTemplate: (id: string, payload: Omit<QuizTemplate, "id" | "version">) => apiPut<QuizTemplate>(`/api/v1/academy/admin/quizzes/${id}`, payload, admin),
  assignQuiz: (cohortId: string, payload: QuizAssignmentInput) => apiPost<QuizAssignment>(`/api/v1/academy/admin/cohorts/${cohortId}/quizzes`, payload, admin),
  listAssignments: (cohortId: string) => apiGet<QuizAssignment[]>(`/api/v1/academy/admin/cohorts/${cohortId}/quizzes`, admin),
  listLearner: (enrollmentId: string) => apiGet<LearnerQuiz[]>(`/api/v1/academy/enrollments/${enrollmentId}/quizzes`, admin),
  submit: (enrollmentId: string, assignmentId: string, answers: Record<string,string[]>) => apiPost<QuizResult>(`/api/v1/academy/enrollments/${enrollmentId}/quizzes/${assignmentId}/attempt`, { answers }, admin),
  completion: (enrollmentId: string) => apiGet<KnowledgeCompletion>(`/api/v1/academy/enrollments/${enrollmentId}/quizzes/completion`, admin),
};
