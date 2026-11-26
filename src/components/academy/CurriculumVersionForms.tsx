"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export type LessonBlock = { duration_minutes: number; activity: string };
export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correct_index: number;
};

export function MilestoneFields({
  goal,
  setGoal,
  criteria,
  setCriteria,
  newCriterion,
  setNewCriterion,
  onAddCriterion,
  evidencePolicy,
  setEvidencePolicy,
  safetyGate,
  setSafetyGate,
  validityDays,
  setValidityDays,
  poolDepth,
  setPoolDepth,
}: {
  goal: string;
  setGoal: (v: string) => void;
  criteria: string[];
  setCriteria: React.Dispatch<React.SetStateAction<string[]>>;
  newCriterion: string;
  setNewCriterion: (v: string) => void;
  onAddCriterion: () => void;
  evidencePolicy: "video" | "time_trial" | "observation";
  setEvidencePolicy: (v: "video" | "time_trial" | "observation") => void;
  safetyGate: boolean;
  setSafetyGate: (v: boolean) => void;
  validityDays: string;
  setValidityDays: (v: string) => void;
  poolDepth: string;
  setPoolDepth: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Textarea
        label="Observable pass standard (goal)"
        name="milestone-goal"
        rows={2}
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="e.g. Swim 25m continuous freestyle without touching floor or wall."
      />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Evidence policy
          <select
            value={evidencePolicy}
            onChange={(e) =>
              setEvidencePolicy(e.target.value as "video" | "time_trial" | "observation")
            }
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="video">Video evidence (portable passport eligible)</option>
            <option value="time_trial">Time trial + video (portable passport eligible)</option>
            <option value="observation">Coach observation only (non-portable)</option>
          </select>
        </label>
        <Input
          label={
            safetyGate
              ? "Recheck validity interval (days — required for safety gate)"
              : "Recheck validity interval (days, optional)"
          }
          name="validity-days"
          type="number"
          min="1"
          value={validityDays}
          onChange={(e) => setValidityDays(e.target.value)}
          placeholder="365"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input
          label="Assessment pool context (optional)"
          name="pool-depth"
          value={poolDepth}
          onChange={(e) => setPoolDepth(e.target.value)}
          placeholder="e.g. shallow_chest_deep, standard_25m"
        />
        <label className="flex items-center gap-2 pt-5 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={safetyGate}
            onChange={(e) => {
              const checked = e.target.checked;
              setSafetyGate(checked);
              if (checked && !validityDays.trim()) setValidityDays("365");
            }}
          />
          Mandatory safety gate (requires validity days)
        </label>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm font-medium text-slate-800">
          Rubric criteria codes ({criteria.length})
        </p>
        <p className="text-xs text-slate-500">
          Every criterion listed here must be explicitly attested before verification is issued.
        </p>
        <div className="flex flex-wrap gap-2">
          {criteria.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-900"
            >
              <code>{code}</code>
              <button
                type="button"
                aria-label={`Remove criterion ${code}`}
                onClick={() => setCriteria((prev) => prev.filter((item) => item !== code))}
                className="text-cyan-700 hover:text-rose-700"
              >
                ×
              </button>
            </span>
          ))}
          {criteria.length === 0 && (
            <span className="text-xs text-amber-700">
              Add at least one criterion before publishing.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            label="Add criterion code"
            name="new-criterion"
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddCriterion();
              }
            }}
            placeholder="e.g. continuous-25m-unassisted"
          />
          <div className="pt-6">
            <Button type="button" size="sm" variant="secondary" onClick={onAddCriterion}>
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DrillFields({
  focalCue,
  setFocalCue,
  steps,
  setSteps,
  requiresSupervision,
  setRequiresSupervision,
  safetyNotes,
  setSafetyNotes,
}: {
  focalCue: string;
  setFocalCue: (v: string) => void;
  steps: string[];
  setSteps: React.Dispatch<React.SetStateAction<string[]>>;
  requiresSupervision: boolean;
  setRequiresSupervision: (v: boolean) => void;
  safetyNotes: string;
  setSafetyNotes: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        label="Primary focal cue (1 TI coaching cue)"
        name="primary-focal-cue"
        value={focalCue}
        onChange={(e) => setFocalCue(e.target.value)}
        placeholder="e.g. Eyes straight down; weightless head aligned with spine."
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={requiresSupervision}
          onChange={(e) => setRequiresSupervision(e.target.checked)}
        />
        Requires coach supervision
      </label>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Execution steps</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setSteps((p) => [...p, ""])}>
            + Add step
          </Button>
        </div>
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="pt-2 text-xs font-semibold text-slate-500">{idx + 1}.</span>
            <input
              type="text"
              value={step}
              onChange={(e) =>
                setSteps((p) => p.map((item, i) => (i === idx ? e.target.value : item)))
              }
              placeholder="Step instruction..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {steps.length > 1 && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setSteps((p) => p.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      <Input
        label="Safety notes (optional)"
        name="drill-safety"
        value={safetyNotes}
        onChange={(e) => setSafetyNotes(e.target.value)}
        placeholder="e.g. Chest-deep water only; poolside supervision required."
      />
    </div>
  );
}

export function LessonFields({
  duration,
  setDuration,
  blocks,
  setBlocks,
  safetyNotes,
  setSafetyNotes,
}: {
  duration: string;
  setDuration: (v: string) => void;
  blocks: LessonBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<LessonBlock[]>>;
  safetyNotes: string;
  setSafetyNotes: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Total duration (minutes)" name="lesson-duration" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
        <Input label="Safety notes (optional)" name="lesson-safety" value={safetyNotes} onChange={(e) => setSafetyNotes(e.target.value)} placeholder="e.g. Max 6:1 swimmer-to-coach ratio." />
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Timed teaching blocks</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setBlocks((p) => [...p, { duration_minutes: 15, activity: "" }])}>
            + Add block
          </Button>
        </div>
        {blocks.map((block, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-[90px_1fr_auto]">
            <input
              type="number"
              min="1"
              value={block.duration_minutes}
              onChange={(e) =>
                setBlocks((p) =>
                  p.map((item, i) => (i === idx ? { ...item, duration_minutes: Number(e.target.value) } : item)),
                )
              }
              aria-label={`Block ${idx + 1} minutes`}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            />
            <input
              type="text"
              value={block.activity}
              onChange={(e) =>
                setBlocks((p) =>
                  p.map((item, i) => (i === idx ? { ...item, activity: e.target.value } : item)),
                )
              }
              placeholder="Block activity (e.g. Core drill progression)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {blocks.length > 1 && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setBlocks((p) => p.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuizFields({
  passingPercent,
  setPassingPercent,
  questions,
  setQuestions,
}: {
  passingPercent: string;
  setPassingPercent: (v: string) => void;
  questions: QuizQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<QuizQuestion[]>>;
}) {
  return (
    <div className="space-y-3">
      <div className="w-48">
        <Input label="Passing percentage (%)" name="passing-percent" type="number" min="1" max="100" value={passingPercent} onChange={(e) => setPassingPercent(e.target.value)} />
      </div>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Questions</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setQuestions((p) => [
                ...p,
                { id: `q${p.length + 1}`, prompt: "", options: ["Option A", "Option B"], correct_index: 0 },
              ])
            }
          >
            + Add question
          </Button>
        </div>
        {questions.map((question, qIdx) => (
          <div key={qIdx} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">Question {qIdx + 1} ({question.id})</span>
              {questions.length > 1 && (
                <Button type="button" size="sm" variant="secondary" onClick={() => setQuestions((p) => p.filter((_, i) => i !== qIdx))}>
                  Remove
                </Button>
              )}
            </div>
            <input
              type="text"
              value={question.prompt}
              onChange={(e) => setQuestions((p) => p.map((q, i) => (i === qIdx ? { ...q, prompt: e.target.value } : q)))}
              placeholder="Enter question prompt..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="space-y-1.5">
              {question.options.map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`quiz-correct-${qIdx}`}
                    checked={question.correct_index === optIdx}
                    onChange={() => setQuestions((p) => p.map((q, i) => (i === qIdx ? { ...q, correct_index: optIdx } : q)))}
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) =>
                      setQuestions((p) =>
                        p.map((q, i) =>
                          i === qIdx
                            ? { ...q, options: q.options.map((o, oi) => (oi === optIdx ? e.target.value : o)) }
                            : q,
                        ),
                      )
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setQuestions((p) =>
                    p.map((q, i) =>
                      i === qIdx ? { ...q, options: [...q.options, `Option ${q.options.length + 1}`] } : q,
                    ),
                  )
                }
                className="text-xs font-medium text-cyan-700 hover:underline"
              >
                + Add option
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ModuleFields({
  outcomes,
  setOutcomes,
  allMilestonesRequired,
  setAllMilestonesRequired,
}: {
  outcomes: string[];
  setOutcomes: React.Dispatch<React.SetStateAction<string[]>>;
  allMilestonesRequired: boolean;
  setAllMilestonesRequired: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-800">Learning outcomes</p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setOutcomes((p) => [...p, ""])}>
            + Add outcome
          </Button>
        </div>
        {outcomes.map((outcome, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={outcome}
              onChange={(e) => setOutcomes((p) => p.map((item, i) => (i === idx ? e.target.value : item)))}
              placeholder="Describe an observable module outcome..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {outcomes.length > 1 && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setOutcomes((p) => p.filter((_, i) => i !== idx))}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={allMilestonesRequired} onChange={(e) => setAllMilestonesRequired(e.target.checked)} />
        Require all mandatory milestones in module for completion
      </label>
    </div>
  );
}
