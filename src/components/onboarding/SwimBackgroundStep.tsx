"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { strokesOptions } from "@/lib/options";

type SwimBackgroundFormData = {
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  goalsNarrative: string;
};

type SwimBackgroundStepProps = {
  formData: SwimBackgroundFormData;
  onUpdate: (field: keyof SwimBackgroundFormData, value: string | string[]) => void;
  onToggleStroke: (stroke: string) => void;
};

export function SwimBackgroundStep({ formData, onUpdate, onToggleStroke }: SwimBackgroundStepProps) {
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

      <Textarea
        label="Goals"
        name="goalsNarrative"
        value={formData.goalsNarrative}
        onChange={(e) => onUpdate("goalsNarrative", e.target.value)}
        placeholder="E.g., swim confidently, learn freestyle, improve technique, prepare for open water..."
        rows={4}
        required
      />
    </div>
  );
}

