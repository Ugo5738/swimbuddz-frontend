"use client";

import { buildGoalsNarrative } from "@/components/onboarding/SwimBackgroundStep";
import { apiPatch } from "@/lib/api";
import { VolunteersApi } from "@/lib/volunteers";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { OnboardingDraft, StepKey } from "../types";

type CoreForm = OnboardingDraft["coreForm"] & { profilePhotoMediaId: string };
type ClubForm = OnboardingDraft["clubForm"];
type ClubReadinessForm = OnboardingDraft["clubReadinessForm"];
type SwimForm = OnboardingDraft["swimForm"];
type AcademyForm = OnboardingDraft["academyForm"];
type SignalsForm = OnboardingDraft["signalsForm"];

type Params = {
  // Form state
  coreForm: CoreForm;
  clubForm: ClubForm;
  clubReadinessForm: ClubReadinessForm;
  swimForm: SwimForm;
  academyForm: AcademyForm;
  signalsForm: SignalsForm;
  // Context
  clubContext: boolean;
  academyContext: boolean;
  // Validity flags
  coreFormValid: boolean;
  safetyFormValid: boolean;
  swimFormValid: boolean;
  clubReadinessValid: boolean;
  academyFormValid: boolean;
  // Step navigation
  currentStep: StepKey;
  setCurrentStep: (step: StepKey) => void;
  nextStepFrom: (step: StepKey, opts?: { assumeSatisfied?: StepKey }) => StepKey;
  // External effects
  clearDraft: () => void;
  loadMemberSilent: () => Promise<void>;
};

export function useSaveOnboarding({
  coreForm,
  clubForm,
  clubReadinessForm,
  swimForm,
  academyForm,
  signalsForm,
  clubContext,
  academyContext,
  coreFormValid,
  safetyFormValid,
  swimFormValid,
  clubReadinessValid,
  academyFormValid,
  currentStep,
  setCurrentStep,
  nextStepFrom,
  clearDraft,
  loadMemberSilent,
}: Params) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const saveCore = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          first_name: coreForm.firstName,
          last_name: coreForm.lastName,
          profile_photo_media_id: coreForm.profilePhotoMediaId || null,
          profile: {
            phone: coreForm.phone,
            area_in_lagos: coreForm.areaInLagos || undefined,
            address: coreForm.areaInLagos || undefined,
            country: coreForm.country,
            city: coreForm.city,
            state: coreForm.state,
            gender: coreForm.gender,
            date_of_birth: coreForm.dateOfBirth,
            time_zone: coreForm.timeZone,
          },
        },
        { auth: true },
      );
      toast.success("Core profile saved");
      clearDraft();
      await loadMemberSilent();
      return true;
    } catch {
      toast.error("Failed to save core profile");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSafety = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          emergency_contact: {
            name: clubForm.emergencyContactName,
            contact_relationship: clubForm.emergencyContactRelationship,
            phone: clubForm.emergencyContactPhone,
            medical_info: clubForm.medicalInfo,
          },
          availability: {
            preferred_locations: clubForm.locationPreference,
            preferred_times: clubForm.timeOfDayAvailability,
          },
        },
        { auth: true },
      );
      toast.success("Safety & logistics saved");
      clearDraft();
      await loadMemberSilent();
      return true;
    } catch {
      toast.error("Failed to save safety & logistics");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSwimBackground = async (): Promise<boolean> => {
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          profile: {
            swim_level: swimForm.swimLevel,
            deep_water_comfort: swimForm.deepWaterComfort,
            strokes: swimForm.strokes,
            personal_goals: buildGoalsNarrative(swimForm.goals, swimForm.otherGoals),
          },
        },
        { auth: true },
      );
      toast.success("Swimming background saved");
      clearDraft();
      await loadMemberSilent();
      return true;
    } catch {
      toast.error("Failed to save swimming background");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveClubReadiness = async (): Promise<boolean> => {
    if (!clubContext) return true;
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          availability: {
            available_days: clubReadinessForm.availabilitySlots,
          },
          membership: {
            club_notes: clubReadinessForm.clubNotes || undefined,
          },
        },
        { auth: true },
      );
      toast.success("Club readiness saved");
      clearDraft();
      await loadMemberSilent();
      return true;
    } catch {
      toast.error("Failed to save Club readiness");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveAcademy = async (): Promise<boolean> => {
    if (!academyContext) return true;
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          membership: {
            academy_skill_assessment: academyForm.academySkillAssessment,
            academy_goals: academyForm.academyGoals,
            academy_preferred_coach_gender: academyForm.academyPreferredCoachGender,
            academy_lesson_preference: academyForm.academyLessonPreference,
          },
        },
        { auth: true },
      );
      toast.success("Academy readiness saved");
      clearDraft();
      await loadMemberSilent();
      return true;
    } catch {
      toast.error("Failed to save Academy readiness");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSignals = async () => {
    setSaving(true);
    try {
      await apiPatch(
        "/api/v1/members/me",
        {
          profile: {
            interests: signalsForm.interests,
          },
          preferences: {
            volunteer_interest: signalsForm.volunteerInterest,
          },
        },
        { auth: true },
      );

      // Also create/update volunteer profile in volunteer service
      // Map category codes from registration to role IDs
      if (signalsForm.volunteerInterest.length > 0) {
        try {
          const allRoles = await VolunteersApi.listRoles();
          const roleIds = signalsForm.volunteerInterest
            .map((cat) => {
              const match = allRoles.find((r) => r.category.toLowerCase() === cat.toLowerCase());
              return match?.id;
            })
            .filter(Boolean) as string[];

          if (roleIds.length > 0) {
            try {
              // Try to create new profile
              await VolunteersApi.registerAsVolunteer({ preferred_roles: roleIds });
            } catch {
              // 409 = already registered → update instead
              await VolunteersApi.updateMyProfile({ preferred_roles: roleIds }).catch(() => {});
            }
          }
        } catch {
          // Non-critical — volunteer profile sync is best-effort
          console.warn("Could not sync volunteer profile from onboarding");
        }
      }

      toast.success("Preferences saved");
      clearDraft();
      await loadMemberSilent();
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (currentStep === "core") {
      if (!coreFormValid) return;
      const saved = await saveCore();
      if (!saved) return;
      setCurrentStep(nextStepFrom("core", { assumeSatisfied: "core" }));
      return;
    }

    if (currentStep === "safety") {
      if (!safetyFormValid) return;
      const saved = await saveSafety();
      if (!saved) return;
      setCurrentStep(nextStepFrom("safety", { assumeSatisfied: "safety" }));
      return;
    }

    if (currentStep === "swim") {
      if (!swimFormValid) return;
      const saved = await saveSwimBackground();
      if (!saved) return;
      setCurrentStep(nextStepFrom("swim", { assumeSatisfied: "swim" }));
      return;
    }

    if (currentStep === "club") {
      if (!clubReadinessValid) return;
      const saved = await saveClubReadiness();
      if (!saved) return;
      setCurrentStep(nextStepFrom("club", { assumeSatisfied: "club" }));
      return;
    }

    if (currentStep === "academy") {
      if (!academyFormValid) return;
      const saved = await saveAcademy();
      if (!saved) return;
      setCurrentStep(nextStepFrom("academy", { assumeSatisfied: "academy" }));
      return;
    }

    if (currentStep === "signals") {
      const hasAnything =
        (signalsForm.interests && signalsForm.interests.length > 0) ||
        (signalsForm.volunteerInterest && signalsForm.volunteerInterest.length > 0);
      if (hasAnything) await saveSignals();
      setCurrentStep("review");
      return;
    }

    if (currentStep === "review") {
      clearDraft();
      router.push("/account");
      return;
    }
  };

  return { saving, setSaving, handleContinue };
}
