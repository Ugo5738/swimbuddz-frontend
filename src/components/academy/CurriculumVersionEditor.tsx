"use client";

import { useEffect, useState } from "react";

import {
  DrillFields,
  type LessonBlock,
  LessonFields,
  MilestoneFields,
  ModuleFields,
  QuizFields,
  type QuizQuestion,
} from "@/components/academy/CurriculumVersionForms";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { CurriculumKind } from "@/lib/academy/curriculum-library";

interface CurriculumVersionEditorProps {
  kind: CurriculumKind;
  initialContent: Record<string, unknown>;
  editingVersionNumber?: number | null;
  saving: boolean;
  onCancelEdit?: () => void;
  onSave: (content: Record<string, unknown>) => Promise<void>;
}

const asString = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
const asObject = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string"
        ? item
        : item && typeof item === "object" && "code" in item
          ? asString((item as { code?: unknown }).code)
          : "",
    )
    .filter((item) => item.trim().length > 0);
}

function parseLessonBlocks(value: unknown): LessonBlock[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ duration_minutes: 15, activity: "Warmup" }];
  }
  return value.map((item) => {
    const obj = asObject(item);
    const minutes =
      typeof obj.duration_minutes === "number"
        ? obj.duration_minutes
        : typeof obj.minutes === "number"
          ? obj.minutes
          : 15;
    return {
      duration_minutes: Math.max(1, Math.round(minutes)),
      activity: asString(obj.activity) || asString(obj.name) || "Activity",
    };
  });
}

function parseQuizQuestions(value: unknown): QuizQuestion[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [{ id: "q1", prompt: "", options: ["Option A", "Option B"], correct_index: 0 }];
  }
  return value.map((item, idx) => {
    const obj = asObject(item);
    const options = Array.isArray(obj.options)
      ? obj.options.map((opt) => asString(opt)).filter(Boolean)
      : ["Option A", "Option B"];
    const correctIndex = typeof obj.correct_index === "number" ? obj.correct_index : 0;
    return {
      id: asString(obj.id) || `q${idx + 1}`,
      prompt: asString(obj.prompt),
      options: options.length >= 2 ? options : ["Option A", "Option B"],
      correct_index: Math.max(0, Math.min(correctIndex, Math.max(0, options.length - 1))),
    };
  });
}

export function CurriculumVersionEditor({
  kind,
  initialContent,
  editingVersionNumber = null,
  saving,
  onCancelEdit,
  onSave,
}: CurriculumVersionEditorProps) {
  const [advancedJsonMode, setAdvancedJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initialContent, null, 2));
  const [localError, setLocalError] = useState<string | null>(null);

  const [msGoal, setMsGoal] = useState("");
  const [msCriteria, setMsCriteria] = useState<string[]>([]);
  const [msNewCriterion, setMsNewCriterion] = useState("");
  const [msEvidencePolicy, setMsEvidencePolicy] = useState<"video" | "time_trial" | "observation">("video");
  const [msSafetyGate, setMsSafetyGate] = useState(false);
  const [msValidityDays, setMsValidityDays] = useState("365");
  const [msPoolDepth, setMsPoolDepth] = useState("");

  const [drillFocalCue, setDrillFocalCue] = useState("");
  const [drillSteps, setDrillSteps] = useState<string[]>([""]);
  const [drillRequiresSupervision, setDrillRequiresSupervision] = useState(true);
  const [drillSafetyNotes, setDrillSafetyNotes] = useState("");

  const [lessonDuration, setLessonDuration] = useState("60");
  const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>([{ duration_minutes: 15, activity: "Warmup" }]);
  const [lessonSafetyNotes, setLessonSafetyNotes] = useState("");

  const [quizPassingPercent, setQuizPassingPercent] = useState("80");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [moduleOutcomes, setModuleOutcomes] = useState<string[]>([""]);
  const [moduleAllMilestonesRequired, setModuleAllMilestonesRequired] = useState(true);

  useEffect(() => {
    setLocalError(null);
    setRawJson(JSON.stringify(initialContent, null, 2));
    setAdvancedJsonMode(false);
    if (kind === "milestone") {
      const rubric = asObject(initialContent.rubric_json);
      const context = asObject(initialContent.assessment_context_json);
      setMsGoal(asString(rubric.goal));
      const criteria = asStringList(rubric.criteria);
      setMsCriteria(criteria.length > 0 ? criteria : ["observable-pass-criterion"]);
      setMsNewCriterion("");
      const policy = asString(initialContent.evidence_policy, "video");
      setMsEvidencePolicy(policy === "time_trial" || policy === "observation" ? policy : "video");
      setMsSafetyGate(initialContent.safety_gate === true);
      setMsValidityDays(typeof context.validity_days === "number" ? String(context.validity_days) : "");
      setMsPoolDepth(asString(context.pool_depth));
    } else if (kind === "drill") {
      const safety = asObject(initialContent.safety_json);
      setDrillFocalCue(asString(initialContent.primary_focal_cue));
      const steps = asStringList(initialContent.steps_json);
      setDrillSteps(steps.length > 0 ? steps : [""]);
      setDrillRequiresSupervision(initialContent.requires_supervision !== false);
      setDrillSafetyNotes(asString(safety.notes));
    } else if (kind === "lesson") {
      const safety = asObject(initialContent.safety_json);
      setLessonDuration(typeof initialContent.duration_minutes === "number" ? String(initialContent.duration_minutes) : "60");
      setLessonBlocks(parseLessonBlocks(initialContent.blocks_json));
      setLessonSafetyNotes(asString(safety.notes));
    } else if (kind === "quiz") {
      setQuizPassingPercent(typeof initialContent.passing_percent === "number" ? String(initialContent.passing_percent) : "80");
      setQuizQuestions(parseQuizQuestions(initialContent.questions_json));
    } else {
      const outcomes = asStringList(initialContent.outcomes_json);
      const policy = asObject(initialContent.completion_policy_json);
      setModuleOutcomes(outcomes.length > 0 ? outcomes : [""]);
      setModuleAllMilestonesRequired(policy.all_required_milestones !== false);
    }
  }, [kind, initialContent]);

  const buildStructuredContent = (): Record<string, unknown> => {
    if (kind === "milestone") {
      const cleanedCriteria = msCriteria.map((c) => c.trim()).filter(Boolean);
      const nextContext: Record<string, unknown> = { ...asObject(initialContent.assessment_context_json) };
      if (msValidityDays.trim()) {
        const parsedDays = Number(msValidityDays);
        if (!Number.isInteger(parsedDays) || parsedDays <= 0) {
          throw new Error("Validity interval must be a positive whole number of days.");
        }
        nextContext.validity_days = parsedDays;
      } else {
        delete nextContext.validity_days;
      }
      if (msPoolDepth.trim()) nextContext.pool_depth = msPoolDepth.trim();
      else delete nextContext.pool_depth;
      return {
        rubric_json: {
          ...asObject(initialContent.rubric_json),
          goal: msGoal.trim() || "Observable milestone standard",
          criteria: cleanedCriteria,
        },
        evidence_policy: msEvidencePolicy,
        safety_gate: msSafetyGate,
        assessment_context_json: nextContext,
      };
    }
    if (kind === "drill") {
      const steps = drillSteps.map((s) => s.trim()).filter(Boolean);
      if (steps.length === 0) throw new Error("Add at least one execution step.");
      if (!drillFocalCue.trim()) throw new Error("Provide one primary coaching focal cue.");
      const nextSafety: Record<string, unknown> = { ...asObject(initialContent.safety_json) };
      if (drillSafetyNotes.trim()) nextSafety.notes = drillSafetyNotes.trim();
      else delete nextSafety.notes;
      return {
        primary_focal_cue: drillFocalCue.trim(),
        steps_json: steps,
        requires_supervision: drillRequiresSupervision,
        safety_json: nextSafety,
      };
    }
    if (kind === "lesson") {
      const duration = Number(lessonDuration);
      if (!Number.isInteger(duration) || duration <= 0) {
        throw new Error("Lesson duration must be a positive whole number of minutes.");
      }
      const blocks = lessonBlocks
        .map((b) => ({ duration_minutes: Math.max(1, Math.round(b.duration_minutes || 1)), activity: b.activity.trim() }))
        .filter((b) => b.activity.length > 0);
      if (blocks.length === 0) throw new Error("Add at least one teaching block.");
      const nextSafety: Record<string, unknown> = { ...asObject(initialContent.safety_json) };
      if (lessonSafetyNotes.trim()) nextSafety.notes = lessonSafetyNotes.trim();
      else delete nextSafety.notes;
      return { duration_minutes: duration, blocks_json: blocks, safety_json: nextSafety };
    }
    if (kind === "quiz") {
      const passing = Number(quizPassingPercent);
      if (!Number.isInteger(passing) || passing < 1 || passing > 100) {
        throw new Error("Passing percentage must be between 1 and 100.");
      }
      const questions = quizQuestions
        .map((q, idx) => ({
          id: q.id.trim() || `q${idx + 1}`,
          prompt: q.prompt.trim(),
          options: q.options.map((opt) => opt.trim()).filter(Boolean),
          correct_index: q.correct_index,
        }))
        .filter((q) => q.prompt.length > 0);
      if (questions.length === 0) throw new Error("Add at least one quiz question.");
      return { passing_percent: passing, questions_json: questions };
    }
    const outcomes = moduleOutcomes.map((o) => o.trim()).filter(Boolean);
    if (outcomes.length === 0) throw new Error("Add at least one learning outcome.");
    return {
      outcomes_json: outcomes,
      completion_policy_json: {
        ...asObject(initialContent.completion_policy_json),
        all_required_milestones: moduleAllMilestonesRequired,
      },
    };
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      let content: Record<string, unknown>;
      if (advancedJsonMode) {
        const parsed: unknown = JSON.parse(rawJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Version JSON must be an object.");
        }
        content = parsed as Record<string, unknown>;
      } else {
        content = buildStructuredContent();
      }
      await onSave(content);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Invalid version content.");
    }
  };

  const addCriterion = () => {
    const cleaned = msNewCriterion.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!cleaned) return;
    if (msCriteria.includes(cleaned)) {
      setLocalError(`Criterion "${cleaned}" already exists.`);
      return;
    }
    setLocalError(null);
    setMsCriteria((prev) => [...prev, cleaned]);
    setMsNewCriterion("");
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {editingVersionNumber !== null ? `Editing draft v${editingVersionNumber}` : "Create next draft version"}
          </h3>
          <p className="text-xs text-slate-600">
            Drafts can be edited until published. Published versions are frozen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setLocalError(null);
              if (!advancedJsonMode) {
                try {
                  setRawJson(JSON.stringify(buildStructuredContent(), null, 2));
                } catch {}
              }
              setAdvancedJsonMode((v) => !v);
            }}
            className="text-xs font-medium text-cyan-700 hover:underline"
          >
            {advancedJsonMode ? "Switch to structured form" : "Advanced JSON"}
          </button>
          {editingVersionNumber !== null && onCancelEdit && (
            <Button type="button" size="sm" variant="secondary" onClick={onCancelEdit}>
              Cancel edit
            </Button>
          )}
        </div>
      </div>

      {localError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {localError}
        </div>
      )}

      {advancedJsonMode ? (
        <Textarea label="Version content (JSON)" name="version-content-json" value={rawJson} onChange={(e) => setRawJson(e.target.value)} rows={12} className="w-full font-mono text-xs" />
      ) : kind === "milestone" ? (
        <MilestoneFields goal={msGoal} setGoal={setMsGoal} criteria={msCriteria} setCriteria={setMsCriteria} newCriterion={msNewCriterion} setNewCriterion={setMsNewCriterion} onAddCriterion={addCriterion} evidencePolicy={msEvidencePolicy} setEvidencePolicy={setMsEvidencePolicy} safetyGate={msSafetyGate} setSafetyGate={setMsSafetyGate} validityDays={msValidityDays} setValidityDays={setMsValidityDays} poolDepth={msPoolDepth} setPoolDepth={setMsPoolDepth} />
      ) : kind === "drill" ? (
        <DrillFields focalCue={drillFocalCue} setFocalCue={setDrillFocalCue} steps={drillSteps} setSteps={setDrillSteps} requiresSupervision={drillRequiresSupervision} setRequiresSupervision={setDrillRequiresSupervision} safetyNotes={drillSafetyNotes} setSafetyNotes={setDrillSafetyNotes} />
      ) : kind === "lesson" ? (
        <LessonFields duration={lessonDuration} setDuration={setLessonDuration} blocks={lessonBlocks} setBlocks={setLessonBlocks} safetyNotes={lessonSafetyNotes} setSafetyNotes={setLessonSafetyNotes} />
      ) : kind === "quiz" ? (
        <QuizFields passingPercent={quizPassingPercent} setPassingPercent={setQuizPassingPercent} questions={quizQuestions} setQuestions={setQuizQuestions} />
      ) : (
        <ModuleFields outcomes={moduleOutcomes} setOutcomes={setModuleOutcomes} allMilestonesRequired={moduleAllMilestonesRequired} setAllMilestonesRequired={setModuleAllMilestonesRequired} />
      )}

      <Button type="button" disabled={saving} onClick={() => void handleSubmit()}>
        {editingVersionNumber !== null ? `Update draft v${editingVersionNumber}` : "Save draft version"}
      </Button>
    </div>
  );
}
