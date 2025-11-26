"use client";

import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Info } from "lucide-react";

interface AcademyDetailsStepProps {
    formData: {
        academySkillAssessment: {
            canFloat: boolean;
            headUnderwater: boolean;
            deepWaterComfort: boolean;
            canSwim25m: boolean;
        };
        academyGoals: string;
        academyPreferredCoachGender: string;
        academyLessonPreference: string;
    };
    onUpdate: (field: string, value: string | Record<string, boolean>) => void;
}

export function AcademyDetailsStep({
    formData,
    onUpdate,
}: AcademyDetailsStepProps) {
    const handleSkillToggle = (skill: string, value: boolean) => {
        onUpdate("academySkillAssessment", {
            ...formData.academySkillAssessment,
            [skill]: value,
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Academy program details
                </h3>
                <p className="text-sm text-slate-600">
                    Help us tailor your learning experience with personalized coaching and structured curriculum.
                </p>
            </div>

            {/* Skill Assessment */}
            <div className="space-y-4 rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
                    <div>
                        <h4 className="font-medium text-cyan-900">Current Skill Assessment</h4>
                        <p className="text-sm text-cyan-700">
                            Be honest about your current abilities - this helps us place you in the right program level.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {[
                        { key: "canFloat", label: "I can float comfortably on my back" },
                        { key: "headUnderwater", label: "I'm comfortable putting my head underwater" },
                        { key: "deepWaterComfort", label: "I'm comfortable in deep water" },
                        { key: "canSwim25m", label: "I can swim 25 meters without stopping" },
                    ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.academySkillAssessment[key as keyof typeof formData.academySkillAssessment]}
                                onChange={(e) => handleSkillToggle(key, e.target.checked)}
                                className="h-5 w-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-slate-700">{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Learning Goals */}
            <Textarea
                label="What are your learning goals?"
                name="academyGoals"
                value={formData.academyGoals}
                onChange={(e) => onUpdate("academyGoals", e.target.value)}
                placeholder="E.g., Learn to swim confidently, improve technique, prepare for triathlon, overcome fear of water..."
                rows={4}
                required
                hint="Tell us what you want to achieve through the Academy program"
            />

            {/* Coach Preferences */}
            <Select
                label="Coach Gender Preference"
                name="academyPreferredCoachGender"
                value={formData.academyPreferredCoachGender}
                onChange={(e) => onUpdate("academyPreferredCoachGender", e.target.value)}
                required
            >
                <option value="">Select preference</option>
                <option value="male">Male coach</option>
                <option value="female">Female coach</option>
                <option value="no_preference">No preference</option>
            </Select>

            <Select
                label="Lesson Preference"
                name="academyLessonPreference"
                value={formData.academyLessonPreference}
                onChange={(e) => onUpdate("academyLessonPreference", e.target.value)}
                required
            >
                <option value="">Select preference</option>
                <option value="group">Group lessons (more affordable)</option>
                <option value="one_on_one">One-on-one lessons (personalized)</option>
                <option value="flexible">Flexible - either works</option>
            </Select>

            <div className="rounded-lg bg-slate-100 p-4">
                <p className="text-sm text-slate-700">
                    <strong>Next steps:</strong> After registration, our team will review your skill assessment
                    and match you with the appropriate program level and coach. You'll receive an email within
                    48 hours with your personalized learning plan.
                </p>
            </div>
        </div>
    );
}
