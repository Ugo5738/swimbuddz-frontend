"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import {
  CoachesApi,
  type CoachGradesData,
  type CoachGradeSuggestion,
  type CoachGradeValue,
} from "@/lib/coaches";
import { useEffect, useState } from "react";

interface CoachGradesCardProps {
  coachProfileId: string;
}

type GradeField =
  | "learn_to_swim_grade"
  | "special_populations_grade"
  | "institutional_grade"
  | "competitive_elite_grade"
  | "certifications_grade"
  | "specialized_disciplines_grade"
  | "adjacent_services_grade";

const GRADE_CATEGORIES: { field: GradeField; label: string }[] = [
  { field: "learn_to_swim_grade", label: "Learn to Swim" },
  { field: "special_populations_grade", label: "Special Populations" },
  { field: "institutional_grade", label: "Institutional" },
  { field: "competitive_elite_grade", label: "Competitive / Elite" },
  { field: "certifications_grade", label: "Certifications" },
  { field: "specialized_disciplines_grade", label: "Specialized Disciplines" },
  { field: "adjacent_services_grade", label: "Adjacent Services" },
];

const GRADE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Not Assigned" },
  { value: "grade_1", label: "Grade 1 — Foundational" },
  { value: "grade_2", label: "Grade 2 — Technical" },
  { value: "grade_3", label: "Grade 3 — Advanced" },
];

export function CoachGradesCard({ coachProfileId }: CoachGradesCardProps) {
  const [grades, setGrades] = useState<CoachGradesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  // Editable grade state
  const [editGrades, setEditGrades] = useState<
    Record<GradeField, CoachGradeValue | null>
  >({
    learn_to_swim_grade: null,
    special_populations_grade: null,
    institutional_grade: null,
    competitive_elite_grade: null,
    certifications_grade: null,
    specialized_disciplines_grade: null,
    adjacent_services_grade: null,
  });

  // AI suggestion state
  const [suggestion, setSuggestion] = useState<CoachGradeSuggestion | null>(
    null,
  );
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    loadGrades();
  }, [coachProfileId]);

  const loadGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await CoachesApi.getGrades(coachProfileId);
      setGrades(data);
      setEditGrades({
        learn_to_swim_grade: data.learn_to_swim_grade,
        special_populations_grade: data.special_populations_grade,
        institutional_grade: data.institutional_grade,
        competitive_elite_grade: data.competitive_elite_grade,
        certifications_grade: data.certifications_grade,
        specialized_disciplines_grade: data.specialized_disciplines_grade,
        adjacent_services_grade: data.adjacent_services_grade,
      });
    } catch {
      setError("Failed to load coach grades");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const { field } of GRADE_CATEGORIES) {
        if (editGrades[field] !== (grades?.[field] ?? null)) {
          payload[field] = editGrades[field] || null;
        }
      }
      if (adminNotes.trim()) {
        payload.admin_notes = adminNotes.trim();
      }

      if (Object.keys(payload).length === 0) {
        setError("No changes to save");
        setSaving(false);
        return;
      }

      const updated = await CoachesApi.updateGrades(coachProfileId, payload);
      setGrades(updated);
      setAdminNotes("");
      setSuccess("Grades updated successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError("Failed to update grades");
    } finally {
      setSaving(false);
    }
  };

  const handleSuggest = async () => {
    setSuggestLoading(true);
    setError(null);
    try {
      const result = await CoachesApi.suggestGrades(coachProfileId);
      setSuggestion(result);
      setShowSuggestion(true);
    } catch {
      setError("AI suggestion failed. The AI service may be unavailable.");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    // Apply the recommended grade to ALL categories
    const newGrades = { ...editGrades };
    for (const { field } of GRADE_CATEGORIES) {
      newGrades[field] = suggestion.recommended_grade;
    }
    setEditGrades(newGrades);
    setAdminNotes(
      `AI suggested ${suggestion.recommended_grade} (confidence: ${Math.round(suggestion.confidence * 100)}%). Rationale: ${suggestion.rationale}`,
    );
  };

  const hasChanges = () => {
    if (!grades) return false;
    return (
      GRADE_CATEGORIES.some(
        ({ field }) => editGrades[field] !== (grades[field] ?? null),
      ) || adminNotes.trim().length > 0
    );
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Coach Grades
        </h2>
        <p className="text-sm text-slate-500">Loading grades...</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Coach Grades</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSuggest}
          disabled={suggestLoading}
        >
          {suggestLoading ? (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
              Analyzing…
            </span>
          ) : (
            "✨ Suggest with AI"
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" title="Success">
          {success}
        </Alert>
      )}

      {/* Stats summary */}
      {grades && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-slate-900">
              {grades.total_coaching_hours}
            </p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">
              Hours
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-slate-900">
              {grades.cohorts_completed}
            </p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">
              Cohorts
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-slate-900">
              {grades.average_feedback_rating?.toFixed(1) ?? "—"}
            </p>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">
              Rating
            </p>
          </div>
        </div>
      )}

      {/* AI Suggestion Panel */}
      {showSuggestion && suggestion && (
        <div className="mb-5 rounded-lg border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-violet-900 flex items-center gap-1.5">
              ✨ AI Recommendation
            </h3>
            <button
              onClick={() => setShowSuggestion(false)}
              className="text-violet-400 hover:text-violet-600 text-sm"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-200 text-violet-800 text-sm font-semibold">
              {GRADE_OPTIONS.find(
                (o) => o.value === suggestion.recommended_grade,
              )?.label ?? suggestion.recommended_grade}
            </span>
            <span className="text-xs text-violet-600">
              {Math.round(suggestion.confidence * 100)}% confidence
            </span>
          </div>

          <p className="text-sm text-violet-800 mb-3">{suggestion.rationale}</p>

          {suggestion.strengths.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-emerald-700 mb-1">
                Strengths
              </p>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {suggestion.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestion.areas_for_improvement.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">
                Areas for Improvement
              </p>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {suggestion.areas_for_improvement.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">○</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button size="sm" onClick={handleApplySuggestion}>
            Apply Suggestion
          </Button>
        </div>
      )}

      {/* Grade Selectors */}
      <div className="space-y-3 mb-5">
        {GRADE_CATEGORIES.map(({ field, label }) => (
          <div key={field} className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-700 min-w-0 flex-1">
              {label}
            </label>
            <select
              value={editGrades[field] ?? ""}
              onChange={(e) =>
                setEditGrades((prev) => ({
                  ...prev,
                  [field]: e.target.value || null,
                }))
              }
              className="text-sm border border-slate-300 rounded-md px-2 py-1.5 w-[180px] focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
            >
              {GRADE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Admin Notes */}
      <div className="mb-4">
        <Textarea
          label="Admin Notes"
          hideLabel
          rows={2}
          placeholder="Grade change notes (saved with update)..."
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !hasChanges()}
        className="w-full"
      >
        {saving ? "Saving..." : "Save Grades"}
      </Button>
    </Card>
  );
}
