"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";

interface VolunteerInterestsStepProps {
    formData: {
        volunteerInterest: string[];
        interestTags: string[];
        showInDirectory: boolean;
    };
    onToggleMulti: (field: string, value: string) => void;
    onUpdate: (field: string, value: boolean) => void;
}

const volunteerRoleOptions = [
    { value: "media", label: "Media & Photography" },
    { value: "logistics", label: "Logistics Support" },
    { value: "coaching_support", label: "Coaching Assistant" },
    { value: "lane_marshal", label: "Lane Marshal" },
    { value: "admin", label: "Administrative Support" },
    { value: "event_planning", label: "Event Planning" },
];

const interestTagOptions = [
    { value: "ocean_swimming", label: "Ocean Swimming" },
    { value: "fitness", label: "Fitness & Health" },
    { value: "triathlon", label: "Triathlon Training" },
    { value: "social", label: "Social Events" },
    { value: "competitive", label: "Competitive Swimming" },
    { value: "technique", label: "Technique Improvement" },
    { value: "safety", label: "Water Safety" },
];

export function VolunteerInterestsStep({
    formData,
    onToggleMulti,
    onUpdate,
}: VolunteerInterestsStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Volunteer & interests
                </h3>
                <p className="text-sm text-slate-600">
                    Tell us how you'd like to contribute and what interests you most. All fields are optional.
                </p>
            </div>

            {/* Volunteer Interests */}
            <OptionPillGroup
                label="Volunteer Interests (Optional)"
                options={volunteerRoleOptions}
                selected={formData.volunteerInterest}
                onToggle={(value) => onToggleMulti("volunteerInterest", value)}
                hint="Select any volunteer roles you'd be interested in helping with"
            />

            {formData.volunteerInterest.length > 0 && (
                <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-900">
                        <strong>Thank you for your interest in volunteering!</strong> We'll reach out when
                        opportunities matching your interests become available.
                    </p>
                </div>
            )}

            {/* Interest Tags */}
            <OptionPillGroup
                label="Swimming Interests (Optional)"
                options={interestTagOptions}
                selected={formData.interestTags}
                onToggle={(value) => onToggleMulti("interestTags", value)}
                hint="Help us connect you with like-minded swimmers"
            />

            {/* Member Directory Opt-in */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">Member Directory</h4>
                <p className="text-sm text-slate-600">
                    Would you like to appear in the member directory? This helps other members connect
                    with you based on shared interests and swimming goals.
                </p>

                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={formData.showInDirectory}
                        onChange={(e) => onUpdate("showInDirectory", e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-slate-900">
                            Yes, show my profile in the member directory
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                            Only your name, city, swim level, and selected interests will be visible to other members.
                        </p>
                    </div>
                </label>
            </div>

            <div className="rounded-lg bg-slate-100 p-4">
                <p className="text-sm text-slate-700">
                    💡 <strong>Tip:</strong> These preferences help us personalize your experience and
                    connect you with the right community activities. You can update them anytime in your profile settings.
                </p>
            </div>
        </div>
    );
}
