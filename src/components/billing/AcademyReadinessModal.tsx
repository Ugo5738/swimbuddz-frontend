"use client";

import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface AcademyReadinessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    initialData?: {
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
    onSave: (data: {
        academy_skill_assessment: Record<string, boolean>;
        academy_goals: string;
        academy_preferred_coach_gender: string;
        academy_lesson_preference: string;
    }) => Promise<void>;
}

export function AcademyReadinessModal({
    isOpen,
    onClose,
    onComplete,
    initialData,
    onSave,
}: AcademyReadinessModalProps) {
    const [formData, setFormData] = useState({
        academySkillAssessment: initialData?.academySkillAssessment || {
            canFloat: false,
            headUnderwater: false,
            deepWaterComfort: false,
            canSwim25m: false,
        },
        academyGoals: initialData?.academyGoals || "",
        academyPreferredCoachGender: initialData?.academyPreferredCoachGender || "",
        academyLessonPreference: initialData?.academyLessonPreference || "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData({
                academySkillAssessment: initialData.academySkillAssessment || {
                    canFloat: false,
                    headUnderwater: false,
                    deepWaterComfort: false,
                    canSwim25m: false,
                },
                academyGoals: initialData.academyGoals || "",
                academyPreferredCoachGender: initialData.academyPreferredCoachGender || "",
                academyLessonPreference: initialData.academyLessonPreference || "",
            });
        }
    }, [initialData]);

    const isValid =
        formData.academyGoals.trim() !== "" &&
        formData.academyPreferredCoachGender !== "" &&
        formData.academyLessonPreference !== "";

    const handleUpdate = (field: string, value: string | Record<string, boolean>) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!isValid) return;
        setSaving(true);
        try {
            await onSave({
                academy_skill_assessment: formData.academySkillAssessment,
                academy_goals: formData.academyGoals,
                academy_preferred_coach_gender: formData.academyPreferredCoachGender,
                academy_lesson_preference: formData.academyLessonPreference,
            });
            onComplete();
        } catch (e) {
            console.error("Failed to save academy readiness:", e);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Complete Academy Readiness
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-slate-600 mb-4">
                        Before enrolling in a cohort, please complete your Academy readiness assessment.
                    </p>
                    <AcademyDetailsStep
                        formData={formData}
                        onUpdate={handleUpdate}
                    />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <Button variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isValid || saving}>
                        {saving ? "Saving..." : "Continue to Enrollment"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
