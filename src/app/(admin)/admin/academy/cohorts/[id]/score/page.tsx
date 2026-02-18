"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  AcademyApi,
  AICoachSuggestion,
  AIDimensionSuggestion,
  AIScoringResponse,
  CoachGrade,
  Cohort,
  CohortComplexityScoreCreate,
  CohortComplexityScoreResponse,
  DimensionScore,
  EligibleCoach,
  ProgramCategory,
} from "@/lib/academy";
import { Bot, Save, Sparkles, Star, Users } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Category labels for display
const CATEGORY_LABELS: Record<ProgramCategory, string> = {
  [ProgramCategory.LEARN_TO_SWIM]: "Learn to Swim",
  [ProgramCategory.SPECIAL_POPULATIONS]: "Special Populations",
  [ProgramCategory.INSTITUTIONAL]: "Institutional",
  [ProgramCategory.COMPETITIVE_ELITE]: "Competitive & Elite",
  [ProgramCategory.CERTIFICATIONS]: "Certifications",
  [ProgramCategory.SPECIALIZED_DISCIPLINES]: "Specialized Disciplines",
  [ProgramCategory.ADJACENT_SERVICES]: "Adjacent Services",
};

// Grade labels for display
const GRADE_LABELS: Record<CoachGrade, string> = {
  [CoachGrade.GRADE_1]: "Grade 1 (Foundational)",
  [CoachGrade.GRADE_2]: "Grade 2 (Technical)",
  [CoachGrade.GRADE_3]: "Grade 3 (Advanced)",
};

const GRADE_COLORS: Record<CoachGrade, string> = {
  [CoachGrade.GRADE_1]: "bg-green-100 text-green-800",
  [CoachGrade.GRADE_2]: "bg-amber-100 text-amber-800",
  [CoachGrade.GRADE_3]: "bg-purple-100 text-purple-800",
};

// Score level descriptions
const SCORE_DESCRIPTIONS = [
  {
    score: 1,
    label: "Minimal",
    description: "Basic level, minimal complexity",
  },
  { score: 2, label: "Low", description: "Below average complexity" },
  { score: 3, label: "Moderate", description: "Average complexity" },
  { score: 4, label: "High", description: "Above average complexity" },
  { score: 5, label: "Maximum", description: "Highest complexity level" },
];

export default function CohortScoringPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;

  // State
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [existingScore, setExistingScore] =
    useState<CohortComplexityScoreResponse | null>(null);
  const [eligibleCoaches, setEligibleCoaches] = useState<EligibleCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [step, setStep] = useState<"category" | "scoring" | "review">(
    "category",
  );
  const [selectedCategory, setSelectedCategory] =
    useState<ProgramCategory | null>(null);
  const [dimensionLabels, setDimensionLabels] = useState<string[]>([]);
  const [dimensionScores, setDimensionScores] = useState<DimensionScore[]>(
    Array(7).fill({ score: 3, rationale: "" }),
  );
  const [previewResult, setPreviewResult] = useState<{
    total_score: number;
    required_coach_grade: CoachGrade;
    pay_band_min: number;
    pay_band_max: number;
  } | null>(null);

  // AI state
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    AIDimensionSuggestion[] | null
  >(null);
  const [aiOverallRationale, setAiOverallRationale] = useState<string | null>(
    null,
  );
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [coachSuggestions, setCoachSuggestions] = useState<AICoachSuggestion[]>(
    [],
  );
  const [suggestingCoach, setSuggestingCoach] = useState(false);

  // Step mapping (matches cohort creation pattern)
  const stepLabels = ["Category", "Dimensions", "Review"];
  const steps: Array<"category" | "scoring" | "review"> = [
    "category",
    "scoring",
    "review",
  ];
  const currentStepIndex = steps.indexOf(step);

  useEffect(() => {
    loadData();
  }, [cohortId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load cohort
      const cohortData = await AcademyApi.getCohort(cohortId);
      setCohort(cohortData);

      // Try to load existing score
      try {
        const scoreData = await AcademyApi.getCohortComplexityScore(cohortId);
        setExistingScore(scoreData);
        // Pre-populate form with existing data
        setSelectedCategory(scoreData.category);
        setDimensionScores([
          {
            score: scoreData.dimension_1_score,
            rationale: scoreData.dimension_1_rationale || "",
          },
          {
            score: scoreData.dimension_2_score,
            rationale: scoreData.dimension_2_rationale || "",
          },
          {
            score: scoreData.dimension_3_score,
            rationale: scoreData.dimension_3_rationale || "",
          },
          {
            score: scoreData.dimension_4_score,
            rationale: scoreData.dimension_4_rationale || "",
          },
          {
            score: scoreData.dimension_5_score,
            rationale: scoreData.dimension_5_rationale || "",
          },
          {
            score: scoreData.dimension_6_score,
            rationale: scoreData.dimension_6_rationale || "",
          },
          {
            score: scoreData.dimension_7_score,
            rationale: scoreData.dimension_7_rationale || "",
          },
        ]);
        setPreviewResult({
          total_score: scoreData.total_score,
          required_coach_grade: scoreData.required_coach_grade,
          pay_band_min: scoreData.pay_band_min,
          pay_band_max: scoreData.pay_band_max,
        });
        // Load dimension labels for the category
        const labels = await AcademyApi.getDimensionLabels(scoreData.category);
        setDimensionLabels(labels.labels);
        // Load eligible coaches
        const coaches = await AcademyApi.getEligibleCoaches(cohortId);
        setEligibleCoaches(coaches);
        setStep("review");
      } catch {
        // No existing score, start fresh
        setExistingScore(null);
      }
    } catch (err) {
      console.error("Failed to load cohort", err);
      setError("Failed to load cohort data");
    } finally {
      setLoading(false);
    }
  }

  async function handleCategorySelect(category: ProgramCategory) {
    try {
      setSelectedCategory(category);
      const labels = await AcademyApi.getDimensionLabels(category);
      setDimensionLabels(labels.labels);
      // Reset AI suggestions when category changes
      setAiSuggestions(null);
      setAiOverallRationale(null);
      setAiConfidence(null);
      setStep("scoring");
    } catch (err) {
      console.error("Failed to load dimension labels", err);
      toast.error("Failed to load scoring dimensions");
    }
  }

  function handleDimensionScoreChange(index: number, score: number) {
    setDimensionScores((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], score };
      return updated;
    });
  }

  function handleDimensionRationaleChange(index: number, rationale: string) {
    setDimensionScores((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], rationale };
      return updated;
    });
  }

  async function handleAISuggest() {
    if (!selectedCategory) return;

    setAiSuggesting(true);
    try {
      const result: AIScoringResponse = await AcademyApi.aiScoreCohort(
        cohortId,
        {
          category: selectedCategory,
        },
      );

      setAiSuggestions(result.dimensions);
      setAiOverallRationale(result.overall_rationale);
      setAiConfidence(result.confidence);

      // Apply AI suggestions to the dimension scores
      const newScores = result.dimensions.map((dim) => ({
        score: dim.score,
        rationale: dim.rationale,
      }));
      setDimensionScores(newScores);

      toast.success("AI suggestions applied! Review and adjust as needed.");
    } catch (err) {
      console.error("AI scoring failed", err);
      toast.error(
        "AI scoring is not available right now. Please score manually.",
      );
    } finally {
      setAiSuggesting(false);
    }
  }

  async function handlePreviewScore() {
    if (!selectedCategory) return;

    try {
      const scores = dimensionScores.map((d) => d.score);
      const result = await AcademyApi.previewComplexityScore(
        selectedCategory,
        scores,
      );
      setPreviewResult(result);
      setStep("review");
    } catch (err) {
      console.error("Failed to preview score", err);
      toast.error("Failed to calculate preview score");
    }
  }

  async function handleSaveScore() {
    if (!selectedCategory || !previewResult) return;

    setSaving(true);
    try {
      const payload: CohortComplexityScoreCreate = {
        category: selectedCategory,
        dimension_1: dimensionScores[0],
        dimension_2: dimensionScores[1],
        dimension_3: dimensionScores[2],
        dimension_4: dimensionScores[3],
        dimension_5: dimensionScores[4],
        dimension_6: dimensionScores[5],
        dimension_7: dimensionScores[6],
      };

      if (existingScore) {
        await AcademyApi.updateCohortComplexityScore(cohortId, payload);
        toast.success("Complexity score updated");
      } else {
        await AcademyApi.createCohortComplexityScore(cohortId, payload);
        toast.success("Complexity score saved");
      }

      // Reload to show updated data
      await loadData();
    } catch (err) {
      console.error("Failed to save score", err);
      toast.error("Failed to save complexity score");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteScore() {
    if (!confirm("Are you sure you want to delete this score?")) return;

    try {
      await AcademyApi.deleteCohortComplexityScore(cohortId);
      toast.success("Complexity score deleted");
      setExistingScore(null);
      setPreviewResult(null);
      setSelectedCategory(null);
      setDimensionScores(Array(7).fill({ score: 3, rationale: "" }));
      setAiSuggestions(null);
      setAiOverallRationale(null);
      setCoachSuggestions([]);
      setStep("category");
    } catch (err) {
      console.error("Failed to delete score", err);
      toast.error("Failed to delete complexity score");
    }
  }

  async function handleSuggestCoach() {
    setSuggestingCoach(true);
    try {
      const result = await AcademyApi.aiSuggestCoach(cohortId);
      setCoachSuggestions(result.suggestions);
      if (result.suggestions.length === 0) {
        toast.info("No coaches to rank — none meet the grade requirement.");
      } else {
        toast.success(
          `AI ranked ${result.suggestions.length} coaches by suitability.`,
        );
      }
    } catch (err) {
      console.error("AI coach suggestion failed", err);
      toast.error("AI coach suggestion is not available right now.");
    } finally {
      setSuggestingCoach(false);
    }
  }

  if (loading) {
    return <LoadingCard text="Loading cohort scoring..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {error}
      </Alert>
    );
  }

  if (!cohort) {
    return (
      <Alert variant="error" title="Not Found">
        Cohort not found
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/admin/academy/cohorts/${cohortId}`)}
            className="text-sm text-slate-500 hover:text-slate-900 mb-2"
          >
            ← Back to Cohort
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            Cohort Complexity Scoring
          </h1>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="flex gap-2">
        {stepLabels.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
              i === currentStepIndex
                ? "bg-cyan-600 text-white"
                : i < currentStepIndex
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="p-6">
        {step === "category" && (
          <CategorySelector onSelect={handleCategorySelect} />
        )}

        {step === "scoring" && selectedCategory && (
          <DimensionScoringForm
            category={selectedCategory}
            labels={dimensionLabels}
            scores={dimensionScores}
            aiSuggestions={aiSuggestions}
            onScoreChange={handleDimensionScoreChange}
            onRationaleChange={handleDimensionRationaleChange}
          />
        )}

        {step === "review" && previewResult && selectedCategory && (
          <ScoreReview
            cohortId={cohortId}
            category={selectedCategory}
            labels={dimensionLabels}
            scores={dimensionScores}
            result={previewResult}
            existingScore={existingScore}
            eligibleCoaches={eligibleCoaches}
            aiOverallRationale={aiOverallRationale}
            aiConfidence={aiConfidence}
            coachSuggestions={coachSuggestions}
            suggestingCoach={suggestingCoach}
            onSuggestCoach={handleSuggestCoach}
          />
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === "scoring") setStep("category");
            else if (step === "review") setStep("scoring");
          }}
          disabled={step === "category"}
        >
          ← Previous
        </Button>

        <div className="flex gap-2">
          {step === "scoring" && (
            <Button
              variant="outline"
              onClick={handleAISuggest}
              disabled={aiSuggesting}
              className="border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {aiSuggesting ? "AI Thinking..." : "AI Suggest Scores"}
            </Button>
          )}

          {step === "review" && existingScore && (
            <Button
              variant="outline"
              onClick={handleDeleteScore}
              className="text-red-600 hover:bg-red-50"
            >
              Delete Score
            </Button>
          )}

          {step === "scoring" ? (
            <Button onClick={handlePreviewScore}>Calculate & Review →</Button>
          ) : step === "review" ? (
            <Button onClick={handleSaveScore} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving
                ? "Saving..."
                : existingScore
                  ? "Update Score"
                  : "Save Score"}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function CategorySelector({
  onSelect,
}: {
  onSelect: (category: ProgramCategory) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">
        Select Program Category
      </h2>
      <p className="text-sm text-slate-600">
        Choose the category that best describes this cohort. Each category has
        specific scoring dimensions tailored to its unique requirements.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onSelect(key as ProgramCategory)}
            className="p-4 border border-slate-200 rounded-lg text-left hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
          >
            <h3 className="font-medium text-slate-900">{label}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {getCategoryDescription(key as ProgramCategory)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function getCategoryDescription(category: ProgramCategory): string {
  const descriptions: Record<ProgramCategory, string> = {
    [ProgramCategory.LEARN_TO_SWIM]:
      "Beginner and foundational swimming programs",
    [ProgramCategory.SPECIAL_POPULATIONS]:
      "Programs for special needs, seniors, or therapy",
    [ProgramCategory.INSTITUTIONAL]:
      "School, corporate, or organizational programs",
    [ProgramCategory.COMPETITIVE_ELITE]:
      "Competitive training and elite athlete programs",
    [ProgramCategory.CERTIFICATIONS]:
      "Lifeguard, instructor, and certification courses",
    [ProgramCategory.SPECIALIZED_DISCIPLINES]:
      "Water polo, diving, synchronized swimming",
    [ProgramCategory.ADJACENT_SERVICES]:
      "Pool parties, swim camps, aqua fitness",
  };
  return descriptions[category];
}

function DimensionScoringForm({
  category,
  labels,
  scores,
  aiSuggestions,
  onScoreChange,
  onRationaleChange,
}: {
  category: ProgramCategory;
  labels: string[];
  scores: DimensionScore[];
  aiSuggestions: AIDimensionSuggestion[] | null;
  onScoreChange: (index: number, score: number) => void;
  onRationaleChange: (index: number, rationale: string) => void;
}) {
  const totalScore = scores.reduce((sum, d) => sum + d.score, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Score Dimensions: {CATEGORY_LABELS[category]}
          </h2>
          <p className="text-sm text-slate-600">
            Rate each dimension from 1 (minimal) to 5 (maximum complexity)
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Running Total</p>
          <p className="text-2xl font-bold text-slate-900">{totalScore}/35</p>
        </div>
      </div>

      {/* AI banner when suggestions are active */}
      {aiSuggestions && (
        <div className="flex items-start gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
          <Sparkles className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-violet-900">
              AI suggestions applied
            </p>
            <p className="text-xs text-violet-600 mt-0.5">
              Scores and rationales have been pre-filled by AI. Review each
              dimension and adjust as needed before proceeding.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {labels.map((label, index) => {
          const aiDim = aiSuggestions?.[index];
          return (
            <div
              key={index}
              className="border-b border-slate-100 pb-6 last:border-0"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900">
                    {index + 1}. {label}
                  </h3>
                  {aiDim && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-700"
                      title={`AI confidence: ${Math.round(aiDim.confidence * 100)}%`}
                    >
                      <Bot className="h-3 w-3" />
                      {Math.round(aiDim.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {SCORE_DESCRIPTIONS.map(({ score }) => (
                    <button
                      key={score}
                      onClick={() => onScoreChange(index, score)}
                      className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                        scores[index].score === score
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-slate-500">
                  {SCORE_DESCRIPTIONS[scores[index].score - 1].label}:{" "}
                  {SCORE_DESCRIPTIONS[scores[index].score - 1].description}
                </span>
              </div>
              <textarea
                placeholder="Add rationale for this score (optional)"
                value={scores[index].rationale || ""}
                onChange={(e) => onRationaleChange(index, e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500"
                rows={2}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScoreReview({
  cohortId,
  category,
  labels,
  scores,
  result,
  existingScore,
  eligibleCoaches,
  aiOverallRationale,
  aiConfidence,
  coachSuggestions,
  suggestingCoach,
  onSuggestCoach,
}: {
  cohortId: string;
  category: ProgramCategory;
  labels: string[];
  scores: DimensionScore[];
  result: {
    total_score: number;
    required_coach_grade: CoachGrade;
    pay_band_min: number;
    pay_band_max: number;
  };
  existingScore: CohortComplexityScoreResponse | null;
  eligibleCoaches: EligibleCoach[];
  aiOverallRationale: string | null;
  aiConfidence: number | null;
  coachSuggestions: AICoachSuggestion[];
  suggestingCoach: boolean;
  onSuggestCoach: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Score Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Score Summary
          </h2>
          <p className="text-sm text-slate-600">
            Category: {CATEGORY_LABELS[category]}
          </p>
        </div>
        {existingScore && <Badge variant="success">Saved</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Score */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Total Score</p>
          <p className="text-4xl font-bold text-slate-900">
            {result.total_score}
          </p>
          <p className="text-sm text-slate-500">out of 35</p>
        </div>

        {/* Required Grade */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Required Coach Grade</p>
          <div className="flex justify-center">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${GRADE_COLORS[result.required_coach_grade]}`}
            >
              {GRADE_LABELS[result.required_coach_grade]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {result.total_score <= 14
              ? "Score 7-14"
              : result.total_score <= 24
                ? "Score 15-24"
                : "Score 25-35"}
          </p>
        </div>

        {/* Pay Band */}
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-1">Pay Band</p>
          <p className="text-2xl font-bold text-slate-900">
            {result.pay_band_min}% - {result.pay_band_max}%
          </p>
          <p className="text-sm text-slate-500">of program revenue</p>
        </div>
      </div>

      {/* AI Overall Rationale */}
      {aiOverallRationale && (
        <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <Bot className="h-5 w-5 text-violet-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-violet-900">AI Analysis</p>
              {aiConfidence !== null && (
                <span className="text-xs px-1.5 py-0.5 bg-violet-200 text-violet-800 rounded">
                  {Math.round(aiConfidence * 100)}% confidence
                </span>
              )}
            </div>
            <p className="text-sm text-violet-700">{aiOverallRationale}</p>
          </div>
        </div>
      )}

      {/* Dimension Breakdown */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="font-medium text-slate-900 mb-3">Dimension Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {labels.map((label, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600">{label}</span>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`h-4 w-4 ${
                        s <= scores[index].score
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-medium text-slate-900">
                  {scores[index].score}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Eligible Coaches */}
      {existingScore && (
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-600" />
              <h3 className="text-lg font-semibold text-slate-900">
                Eligible Coaches ({eligibleCoaches.length})
              </h3>
            </div>
            {eligibleCoaches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSuggestCoach}
                disabled={suggestingCoach}
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                {suggestingCoach ? "AI Thinking..." : "AI Suggest Coach"}
              </Button>
            )}
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Coaches who meet or exceed the{" "}
            {GRADE_LABELS[result.required_coach_grade]} requirement
          </p>

          {/* AI Coach Suggestions */}
          {coachSuggestions.length > 0 && (
            <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-5 w-5 text-violet-600" />
                <h4 className="text-sm font-semibold text-violet-900">
                  AI Recommended Order
                </h4>
              </div>
              <div className="space-y-3">
                {coachSuggestions.map((suggestion, i) => (
                  <div
                    key={suggestion.member_id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-violet-100"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {suggestion.name}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${GRADE_COLORS[suggestion.grade]}`}
                        >
                          {GRADE_LABELS[suggestion.grade]}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">
                          {Math.round(suggestion.match_score * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {suggestion.rationale}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {suggestion.total_coaching_hours != null && (
                          <span>{suggestion.total_coaching_hours} hrs</span>
                        )}
                        {suggestion.average_feedback_rating != null && (
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            {suggestion.average_feedback_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {eligibleCoaches.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No coaches currently meet the grade requirement for this cohort
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {eligibleCoaches.map((coach) => (
                <div
                  key={coach.member_id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-slate-900">{coach.name}</p>
                    <p className="text-sm text-slate-500">{coach.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${GRADE_COLORS[coach.grade]}`}
                    >
                      {GRADE_LABELS[coach.grade]}
                    </span>
                    {coach.total_coaching_hours && (
                      <span className="text-sm text-slate-500">
                        {coach.total_coaching_hours} hrs
                      </span>
                    )}
                    {coach.average_feedback_rating && (
                      <span className="text-sm text-slate-500 flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        {coach.average_feedback_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
