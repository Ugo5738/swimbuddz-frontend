"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { interestOptions, volunteerInterestOptions } from "@/lib/options";

type CommunitySignalsFormData = {
  interests: string[];
  volunteerInterest: string[];
};

type CommunitySignalsStepProps = {
  showHeader?: boolean;
  formData: CommunitySignalsFormData;
  onToggleMulti: (field: keyof CommunitySignalsFormData, value: string) => void;
};

export function CommunitySignalsStep({
  showHeader = true,
  formData,
  onToggleMulti,
}: CommunitySignalsStepProps) {
  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">
            Community signals (optional)
          </h3>
          <p className="text-sm text-slate-600">
            A few light preferences so we can personalize your experience.
          </p>
        </div>
      ) : null}

      <OptionPillGroup
        label="Interests"
        options={interestOptions}
        selected={formData.interests}
        onToggle={(value) => onToggleMulti("interests", value)}
      />

      <OptionPillGroup
        label="Volunteer interests"
        options={volunteerInterestOptions}
        selected={formData.volunteerInterest}
        onToggle={(value) => onToggleMulti("volunteerInterest", value)}
        hint="Optional — you can always opt in later"
      />
      <p className="text-xs text-slate-500">
        <a
          href="/community/volunteers"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-600 hover:text-cyan-700 font-medium"
        >
          Learn about volunteer roles →
        </a>
      </p>
    </div>
  );
}
