"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { strokesOptions } from "@/lib/options";

type SwimBackgroundFormData = {
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  goals: string[];
  otherGoals: string;
};

type SwimBackgroundStepProps = {
  formData: SwimBackgroundFormData;
  onUpdate: (field: keyof SwimBackgroundFormData, value: string | string[]) => void;
  onToggleStroke: (stroke: string) => void;
  onToggleGoal: (goal: string) => void;
};

export const swimGoalOptions = [
  { value: "Swim confidently", label: "Swim confidently" },
  { value: "Learn freestyle", label: "Learn freestyle" },
  { value: "Improve technique", label: "Improve technique" },
  { value: "Build endurance", label: "Build endurance" },
  { value: "Learn to breathe better", label: "Breathing" },
  { value: "Prepare for open water", label: "Open water" },
  { value: "Prepare for triathlon", label: "Triathlon" },
];

export function parseGoalsNarrative(text: string | null | undefined) {
  const normalizedOptions = new Map(
    swimGoalOptions.map((option) => [option.value.toLowerCase(), option.value])
  );

  const raw = String(text || "").trim();
  if (!raw) return { goals: [] as string[], otherGoals: "" };

  const parts = raw
    .split(/[\n;,]+/g)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const goals: string[] = [];
  const otherParts: string[] = [];
  for (const part of parts) {
    const normalized = part.toLowerCase();
    const matched = normalizedOptions.get(normalized);
    if (matched) goals.push(matched);
    else otherParts.push(part);
  }

  const uniqueGoals = Array.from(new Set(goals));
  const otherGoals = otherParts.join("; ");

  // Back-compat: if we couldn't match any goal option, keep the original text as "Other goals".
  if (!uniqueGoals.length && !otherGoals) {
    return { goals: [] as string[], otherGoals: raw };
  }

  return { goals: uniqueGoals, otherGoals };
}

export function buildGoalsNarrative(goals: string[], otherGoals: string) {
  const segments: string[] = [];
  const uniqueGoals = Array.from(new Set((goals || []).filter(Boolean)));
  if (uniqueGoals.length) segments.push(...uniqueGoals);
  const extra = String(otherGoals || "").trim();
  if (extra) segments.push(extra);
  return segments.join("; ");
}

export function SwimBackgroundStep({ formData, onUpdate, onToggleStroke, onToggleGoal }: SwimBackgroundStepProps) {
  const otherGoalsRequired = !formData.goals?.length;
  const otherGoalsMissing = otherGoalsRequired && !String(formData.otherGoals || "").trim();
  const otherGoalsLabelHint = otherGoalsRequired
    ? "Required if you didn’t select a goal above"
    : "Optional";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Swimming background</h3>
        <p className="text-sm text-slate-600">
          This does not lock you into a program — it helps us guide you safely and personally.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Self-declared level"
          name="swimLevel"
          value={formData.swimLevel}
          onChange={(e) => onUpdate("swimLevel", e.target.value)}
          required
        >
          <option value="">Select level</option>
          <option value="non_swimmer">Non-swimmer</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </Select>

        <Select
          label="Deep water comfort"
          name="deepWaterComfort"
          value={formData.deepWaterComfort}
          onChange={(e) => onUpdate("deepWaterComfort", e.target.value)}
          required
        >
          <option value="">Select option</option>
          <option value="learning">Learning</option>
          <option value="comfortable">Comfortable</option>
          <option value="expert">Very comfortable</option>
        </Select>
      </div>

      <OptionPillGroup
        label="Strokes / interests"
        options={strokesOptions}
        selected={formData.strokes}
        onToggle={onToggleStroke}
        hint="Optional — pick anything you're working on"
      />

      <OptionPillGroup
        label="Goals"
        options={swimGoalOptions}
        selected={formData.goals}
        onToggle={onToggleGoal}
        required={!String(formData.otherGoals || "").trim()}
        hint="Select at least one (or fill “Other goals” below)."
      />

      <Textarea
        label="Other goals"
        name="otherGoals"
        value={formData.otherGoals}
        onChange={(e) => onUpdate("otherGoals", e.target.value)}
        placeholder="Add anything else here…"
        rows={4}
        hint={otherGoalsLabelHint}
        required={otherGoalsRequired}
      />
      {otherGoalsMissing ? (
        <p className="text-sm text-rose-300">
          Select at least one goal above, or type your goal in “Other goals”.
        </p>
      ) : null}
    </div>
  );
}
