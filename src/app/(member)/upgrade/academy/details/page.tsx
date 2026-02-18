"use client";

import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { useUpgrade } from "@/lib/upgradeContext";
import { GraduationCap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
  id?: string;
  membership?: {
    academy_skill_assessment?: Record<string, boolean> | null;
    academy_goals?: string | null;
    academy_preferred_coach_gender?: string | null;
    academy_lesson_preference?: string | null;
  } | null;
};

export default function AcademyDetailsPage() {
  const router = useRouter();
  const { state, setAcademyDetailsData, markAcademyDetailsComplete } =
    useUpgrade();

  const [formData, setFormData] = useState<{
    academySkillAssessment: {
      canFloat: boolean;
      headUnderwater: boolean;
      deepWaterComfort: boolean;
      canSwim25m: boolean;
    };
    academyGoals: string;
    academyPreferredCoachGender: string;
    academyLessonPreference: string;
  }>({
    academySkillAssessment: (state.academyDetailsData
      ?.skillAssessment as any) || {
      canFloat: false,
      headUnderwater: false,
      deepWaterComfort: false,
      canSwim25m: false,
    },
    academyGoals: state.academyDetailsData?.goals || "",
    academyPreferredCoachGender:
      state.academyDetailsData?.preferredCoachGender || "",
    academyLessonPreference: state.academyDetailsData?.lessonPreference || "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing data from member profile
  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      const member = await apiGet<Member>("/api/v1/members/me", { auth: true });
      const m = member.membership;
      setFormData({
        academySkillAssessment: (m?.academy_skill_assessment as any) || {
          canFloat: false,
          headUnderwater: false,
          deepWaterComfort: false,
          canSwim25m: false,
        },
        academyGoals: m?.academy_goals || "",
        academyPreferredCoachGender: m?.academy_preferred_coach_gender || "",
        academyLessonPreference: m?.academy_lesson_preference || "",
      });
    } catch (e) {
      console.error("Failed to load member data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handleUpdate = (
    field: string,
    value: string | Record<string, boolean>,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    formData.academyGoals.trim() !== "" &&
    formData.academyPreferredCoachGender !== "" &&
    formData.academyLessonPreference !== "";

  const handleSubmit = async () => {
    if (!isValid) return;

    setSaving(true);
    try {
      // Save to backend
      await apiPatch(
        "/api/v1/members/me",
        {
          membership: {
            academy_skill_assessment: formData.academySkillAssessment,
            academy_goals: formData.academyGoals,
            academy_preferred_coach_gender:
              formData.academyPreferredCoachGender,
            academy_lesson_preference: formData.academyLessonPreference,
            requested_tiers: ["academy"], // Required for academy entitlement activation
          },
        },
        { auth: true },
      );

      // Update context
      setAcademyDetailsData({
        skillAssessment: formData.academySkillAssessment,
        goals: formData.academyGoals,
        preferredCoachGender: formData.academyPreferredCoachGender,
        lessonPreference: formData.academyLessonPreference,
      });
      markAcademyDetailsComplete();

      // Navigate to cohort selection (Details → Cohort → Checkout)
      router.push("/upgrade/academy/cohort");
    } catch (e) {
      toast.error("Failed to save. Please try again.");
      console.error("Save error:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading your profile..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 text-white">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Academy Readiness</h1>
        <p className="text-slate-600 max-w-md mx-auto">
          Tell us about your current skills and learning goals so we can provide
          the best coaching experience.
        </p>
      </div>

      {/* Form Card */}
      <Card className="p-6">
        <AcademyDetailsStep formData={formData} onUpdate={handleUpdate} />

        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            size="lg"
          >
            {saving ? "Saving..." : "Continue to Cohort Selection"}
          </Button>
        </div>
      </Card>

      {/* Info note */}
      <p className="text-center text-sm text-slate-500">
        This information helps coaches personalize your learning experience.
      </p>
    </div>
  );
}
