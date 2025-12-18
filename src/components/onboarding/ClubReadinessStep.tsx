"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Textarea } from "@/components/ui/Textarea";
import { availabilityOptions } from "@/lib/options";

type ClubReadinessFormData = {
  availabilitySlots: string[];
  clubNotes: string;
};

type ClubReadinessStepProps = {
  formData: ClubReadinessFormData;
  onToggleAvailability: (value: string) => void;
  onUpdateNotes: (value: string) => void;
};

export function ClubReadinessStep({ formData, onToggleAvailability, onUpdateNotes }: ClubReadinessStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">Club readiness</h3>
        <p className="text-sm text-slate-600">
          Before you activate Club, confirm the windows you can usually train in. This is not scheduling or enrollment.
        </p>
      </div>

      <OptionPillGroup
        label="Typical weekly availability"
        options={availabilityOptions}
        selected={formData.availabilitySlots}
        onToggle={onToggleAvailability}
        required
        hint="Select all that apply"
      />

      <Textarea
        label="Notes (optional)"
        value={formData.clubNotes}
        onChange={(e) => onUpdateNotes(e.target.value)}
        placeholder="Anything we should know about your schedule, constraints, or preferences?"
        rows={4}
      />
    </div>
  );
}

