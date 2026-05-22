"use client";

import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { CommunitySignalsStep } from "@/components/onboarding/CommunitySignalsStep";
import {
  OTHER_GOAL_VALUE,
  parseGoalsNarrative,
  SwimBackgroundStep,
} from "@/components/onboarding/SwimBackgroundStep";
import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { ClubDetailsStep } from "@/components/registration/ClubDetailsStep";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CoreStep } from "./_onboarding/CoreStep";
import { ProgressHeader } from "./_onboarding/ProgressHeader";
import { ReviewStep } from "./_onboarding/ReviewStep";
import { useOnboardingDraft } from "./_onboarding/useOnboardingDraft";
import { useSaveOnboarding } from "./_onboarding/useSaveOnboarding";
import type { Member, Step, StepKey } from "./types";
import { formatDateForInput, safeParseDraft } from "./utils";

export default function DashboardOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [navigatingToBilling, setNavigatingToBilling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<StepKey>("core");
  const hasInitializedStep = useRef(false);

  const loadMember = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    if (!options?.silent) setError(null);
    try {
      const data = await apiGet<Member>("/api/v1/members/me", { auth: true });
      setMember(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load onboarding.");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadMember();
  }, []);

  // ── Member-derived context ───────────────────────────────────────
  const approvedTiers = useMemo(() => {
    const membership = member?.membership;
    const tiers =
      membership?.active_tiers && membership.active_tiers.length > 0
        ? membership.active_tiers
        : membership?.primary_tier
          ? [membership.primary_tier]
          : ["community"];
    return tiers.map((t: string) => String(t).toLowerCase());
  }, [member]);

  const now = Date.now();
  const communityActive = useMemo(() => {
    const until = member?.membership?.community_paid_until
      ? Date.parse(String(member.membership.community_paid_until))
      : NaN;
    return Number.isFinite(until) && until > now;
  }, [member, now]);

  const requestedTiers = useMemo(
    () => (member?.membership?.requested_tiers || []).map((t: string) => String(t).toLowerCase()),
    [member],
  );
  const wantsAcademy = requestedTiers.includes("academy");
  const wantsClub = requestedTiers.includes("club") || wantsAcademy;

  const clubContext =
    wantsClub || approvedTiers.includes("club") || approvedTiers.includes("academy");
  const academyContext = wantsAcademy || approvedTiers.includes("academy");

  const needsCoreProfile = useMemo(() => {
    if (!member) return false;
    const profile = member.profile;
    return (
      !member.profile_photo_media_id ||
      !profile?.gender ||
      !profile?.date_of_birth ||
      !member.first_name ||
      !member.last_name ||
      !profile?.phone ||
      !profile?.country ||
      !profile?.city ||
      !profile?.time_zone
    );
  }, [member]);

  const needsSafetyLogistics = useMemo(() => {
    if (!member) return false;
    const emergency = member.emergency_contact;
    const availability = member.availability;
    return (
      !emergency?.name ||
      !emergency?.contact_relationship ||
      !emergency?.phone ||
      !(availability?.preferred_locations && availability.preferred_locations.length > 0) ||
      !(availability?.preferred_times && availability.preferred_times.length > 0)
    );
  }, [member]);

  const needsSwimBackground = useMemo(() => {
    if (!member) return false;
    const profile = member.profile;
    return !profile?.swim_level || !profile?.deep_water_comfort || !profile?.personal_goals;
  }, [member]);

  const needsClubReadiness = useMemo(() => {
    if (!member) return false;
    if (!clubContext) return false;
    const availability = member.availability;
    return !(availability?.available_days && availability.available_days.length > 0);
  }, [member, clubContext]);

  const needsAcademyReadiness = useMemo(() => {
    if (!member) return false;
    if (!academyContext) return false;
    const membership = member.membership;
    const assessment = membership?.academy_skill_assessment;
    const hasAssessment =
      assessment &&
      ["canFloat", "headUnderwater", "deepWaterComfort", "canSwim25m"].some((k) =>
        Object.prototype.hasOwnProperty.call(assessment, k),
      );
    return (
      !hasAssessment ||
      !membership?.academy_goals ||
      !membership?.academy_preferred_coach_gender ||
      !membership?.academy_lesson_preference
    );
  }, [member, academyContext]);

  // ── Form state ────────────────────────────────────────────────────
  const [coreForm, setCoreForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    areaInLagos: "",
    city: "",
    state: "",
    country: "",
    gender: "",
    dateOfBirth: "",
    profilePhotoUrl: "",
    profilePhotoMediaId: "",
    timeZone: "",
  });

  const [clubForm, setClubForm] = useState({
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    medicalInfo: "",
    locationPreference: [] as string[],
    timeOfDayAvailability: [] as string[],
    clubNotes: "",
  });

  const [clubReadinessForm, setClubReadinessForm] = useState({
    availabilitySlots: [] as string[],
    clubNotes: "",
  });

  const [swimForm, setSwimForm] = useState({
    swimLevel: "",
    deepWaterComfort: "",
    strokes: [] as string[],
    goals: [] as string[],
    otherGoals: "",
  });

  const [academyForm, setAcademyForm] = useState({
    academySkillAssessment: {
      canFloat: false,
      headUnderwater: false,
      deepWaterComfort: false,
      canSwim25m: false,
    },
    academyGoals: "",
    academyPreferredCoachGender: "",
    academyLessonPreference: "",
  });

  const [signalsForm, setSignalsForm] = useState({
    interests: [] as string[],
    volunteerInterest: [] as string[],
  });

  // ── Hydrate form state from member ────────────────────────────────
  useEffect(() => {
    if (!member) return;

    const profile = member.profile;
    const emergency = member.emergency_contact;
    const availability = member.availability;
    const membership = member.membership;
    const prefs = member.preferences;

    setCoreForm({
      firstName: member.first_name || "",
      lastName: member.last_name || "",
      phone: profile?.phone || "",
      areaInLagos: profile?.area_in_lagos || "",
      city: profile?.city || "",
      state: profile?.state || "",
      country: profile?.country || "",
      gender: profile?.gender || "",
      dateOfBirth: formatDateForInput(profile?.date_of_birth),
      profilePhotoUrl: member.profile_photo_url || "",
      profilePhotoMediaId: member.profile_photo_media_id || "",
      timeZone: profile?.time_zone || "",
    });
    setClubForm({
      emergencyContactName: emergency?.name || "",
      emergencyContactRelationship: emergency?.contact_relationship || "",
      emergencyContactPhone: emergency?.phone || "",
      medicalInfo: emergency?.medical_info || "",
      locationPreference: availability?.preferred_locations || [],
      timeOfDayAvailability: availability?.preferred_times || [],
      clubNotes: membership?.club_notes || "",
    });
    setClubReadinessForm({
      availabilitySlots: availability?.available_days || [],
      clubNotes: membership?.club_notes || "",
    });
    setSwimForm({
      swimLevel: profile?.swim_level || "",
      deepWaterComfort: profile?.deep_water_comfort || "",
      strokes: profile?.strokes || [],
      ...parseGoalsNarrative(profile?.personal_goals),
    });
    setAcademyForm({
      academySkillAssessment: (membership?.academy_skill_assessment as any) || {
        canFloat: false,
        headUnderwater: false,
        deepWaterComfort: false,
        canSwim25m: false,
      },
      academyGoals: membership?.academy_goals || "",
      academyPreferredCoachGender: membership?.academy_preferred_coach_gender || "",
      academyLessonPreference: membership?.academy_lesson_preference || "",
    });
    setSignalsForm({
      interests: profile?.interests || [],
      volunteerInterest: prefs?.volunteer_interest || [],
    });
  }, [member]);

  // ── Toggle helpers ───────────────────────────────────────────────
  const toggleClubMulti = (
    field: "locationPreference" | "timeOfDayAvailability",
    option: string,
  ) => {
    setClubForm((prev) => {
      const current = prev[field];
      const exists = current.includes(option);
      return {
        ...prev,
        [field]: exists ? current.filter((x) => x !== option) : [...current, option],
      };
    });
  };

  const toggleClubReadinessMulti = (option: string) => {
    setClubReadinessForm((prev) => {
      const exists = prev.availabilitySlots.includes(option);
      return {
        ...prev,
        availabilitySlots: exists
          ? prev.availabilitySlots.filter((x) => x !== option)
          : [...prev.availabilitySlots, option],
      };
    });
  };

  const toggleStroke = (stroke: string) => {
    setSwimForm((prev) => {
      const exists = prev.strokes.includes(stroke);
      return {
        ...prev,
        strokes: exists ? prev.strokes.filter((x) => x !== stroke) : [...prev.strokes, stroke],
      };
    });
  };

  const toggleGoal = (goal: string) => {
    setSwimForm((prev) => {
      const exists = prev.goals.includes(goal);
      const nextGoals = exists ? prev.goals.filter((x) => x !== goal) : [...prev.goals, goal];
      return { ...prev, goals: nextGoals };
    });
  };

  const toggleSignalsMulti = (field: "interests" | "volunteerInterest", value: string) => {
    setSignalsForm((prev) => {
      const current = prev[field];
      const exists = current.includes(value);
      return {
        ...prev,
        [field]: exists ? current.filter((x) => x !== value) : [...current, value],
      };
    });
  };

  // ── Validity flags ───────────────────────────────────────────────
  const coreFormValid = Boolean(
    coreForm.firstName &&
      coreForm.lastName &&
      coreForm.phone &&
      coreForm.country &&
      coreForm.state &&
      coreForm.city &&
      coreForm.gender &&
      coreForm.dateOfBirth &&
      (coreForm.profilePhotoMediaId || coreForm.profilePhotoUrl) &&
      coreForm.timeZone,
  );

  const safetyFormValid = Boolean(
    clubForm.emergencyContactName &&
      clubForm.emergencyContactRelationship &&
      clubForm.emergencyContactPhone &&
      clubForm.locationPreference.length > 0 &&
      clubForm.timeOfDayAvailability.length > 0,
  );

  const swimFormValid = Boolean(
    swimForm.swimLevel &&
      swimForm.deepWaterComfort &&
      swimForm.goals.length > 0 &&
      (!swimForm.goals.includes(OTHER_GOAL_VALUE) ||
        Boolean(swimForm.otherGoals && swimForm.otherGoals.trim())),
  );

  const clubReadinessValid = !clubContext || clubReadinessForm.availabilitySlots.length > 0;

  const academyFormValid = Boolean(
    academyForm.academyGoals &&
      academyForm.academyPreferredCoachGender &&
      academyForm.academyLessonPreference,
  );

  // ── Steps + progress derivations ─────────────────────────────────
  const steps = useMemo<Step[]>(() => {
    const base: Step[] = [
      { key: "core", title: "Core profile", required: true },
      { key: "safety", title: "Safety & logistics", required: true },
      { key: "swim", title: "Swimming background", required: true },
    ];
    if (clubContext) base.push({ key: "club", title: "Club readiness", required: true });
    if (academyContext) base.push({ key: "academy", title: "Academy readiness", required: true });
    base.push({ key: "signals", title: "Community signals", required: false });
    base.push({ key: "review", title: "Finish", required: true });
    return base;
  }, [clubContext, academyContext]);

  const stepIndex = steps.findIndex((s) => s.key === currentStep);
  const stepCount = Math.max(steps.length, 1);
  const currentNumber = stepIndex >= 0 ? stepIndex + 1 : 1;
  const currentStepTitle = stepIndex >= 0 ? steps[stepIndex].title : "Onboarding";

  const requiredStepCount = steps.filter((s) => s.required).length;
  const completedRequiredCount = [
    { complete: !needsCoreProfile },
    { complete: !needsSafetyLogistics },
    { complete: !needsSwimBackground },
    ...(clubContext ? [{ complete: !needsClubReadiness }] : []),
    ...(academyContext ? [{ complete: !needsAcademyReadiness }] : []),
    { complete: currentStep === "review" },
  ].filter((item) => item.complete).length;
  const progressPercent =
    requiredStepCount > 0 ? Math.round((completedRequiredCount / requiredStepCount) * 100) : 100;

  function firstIncompleteStep(): StepKey {
    if (needsCoreProfile) return "core";
    if (needsSafetyLogistics) return "safety";
    if (needsSwimBackground) return "swim";
    if (needsClubReadiness) return "club";
    if (needsAcademyReadiness) return "academy";
    return "review";
  }

  function isStepSatisfied(step: StepKey, opts?: { assumeSatisfied?: StepKey }) {
    if (opts?.assumeSatisfied && step === opts.assumeSatisfied) return true;
    if (step === "core") return !needsCoreProfile;
    if (step === "safety") return !needsSafetyLogistics;
    if (step === "swim") return !needsSwimBackground;
    if (step === "club") return !needsClubReadiness;
    if (step === "academy") return !needsAcademyReadiness;
    if (step === "signals") return false;
    if (step === "review") return firstIncompleteStep() === "review";
    return false;
  }

  function nextStepFrom(step: StepKey, opts?: { assumeSatisfied?: StepKey }): StepKey {
    const idx = steps.findIndex((s) => s.key === step);
    for (let i = Math.max(idx + 1, 0); i < steps.length; i++) {
      const key = steps[i].key;
      if (key === "signals" || key === "review") return key;
      if (!isStepSatisfied(key, opts)) return key;
    }
    return "review";
  }

  const missingRequiredSteps = useMemo(() => {
    return steps.filter(
      (step) => step.required && step.key !== "review" && !isStepSatisfied(step.key),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    steps,
    needsCoreProfile,
    needsSafetyLogistics,
    needsSwimBackground,
    needsClubReadiness,
    needsAcademyReadiness,
  ]);

  const hasMissingRequiredSteps = missingRequiredSteps.length > 0;
  const firstMissingRequiredStep = missingRequiredSteps[0];

  // ── URL params + activation target ────────────────────────────────
  const upgradeStepFromUrl = searchParams.get("step") as StepKey | null;
  const isClubUpgradeFlow = upgradeStepFromUrl === "club";

  // Honour a `?next=` deep link (e.g. user came from a public cohort page
  // and signed up; we want to return them to that cohort after onboarding).
  // Restricted to same-origin relative paths to avoid open-redirect issues.
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;

  // Academy intent wins over Club: an academy registrant pays for a cohort
  // (which auto-confers academy tier), so we send them to cohort selection
  // rather than the Club plan picker.
  const activationTarget = wantsAcademy
    ? "academy"
    : wantsClub || isClubUpgradeFlow
      ? "club"
      : !communityActive
        ? "community"
        : null;
  const showBillingCta = Boolean(activationTarget);
  const defaultBillingHref =
    activationTarget === "academy"
      ? "/upgrade/academy/cohort"
      : activationTarget === "club"
        ? "/upgrade/club/plan"
        : activationTarget === "community"
          ? "/checkout?purpose=community"
          : "/account/billing";
  const billingHref = safeNext ?? defaultBillingHref;
  const billingCtaLabel =
    activationTarget === "academy"
      ? safeNext
        ? "Continue to Your Cohort"
        : "Pick Your Cohort"
      : activationTarget === "club"
        ? "Activate Club Membership"
        : activationTarget === "community"
          ? "Activate Community Membership"
          : "Go to Billing";
  const reviewDescription =
    activationTarget === "academy"
      ? safeNext
        ? "You're almost set. Continue to the cohort you picked to complete enrollment."
        : "You're almost set. Pick the cohort you'd like to join — paying for it activates your Academy membership."
      : activationTarget === "club"
        ? communityActive
          ? "You're almost set. Activate your Club membership to unlock Club benefits."
          : "You're almost set. Activate Community + Club to unlock full access."
        : activationTarget === "community"
          ? "You're almost set. Activate your Community membership to unlock full access."
          : "Your onboarding details are saved. Your dashboard will guide you to activation or Academy programs when you're ready.";

  // ── Save + draft hooks ────────────────────────────────────────────
  const { draftKey, clearDraft } = useOnboardingDraft({
    member,
    currentStep,
    coreForm,
    clubForm,
    clubReadinessForm,
    swimForm,
    academyForm,
    signalsForm,
    initialized: hasInitializedStep.current,
  });

  const { saving, setSaving, handleContinue } = useSaveOnboarding({
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
    loadMemberSilent: () => loadMember({ silent: true }),
  });

  // ── Initial step setup: URL param > restored draft > first incomplete
  useEffect(() => {
    if (!member) return;
    if (hasInitializedStep.current) return;
    hasInitializedStep.current = true;

    const requestedStep = searchParams.get("step") as StepKey | null;
    const allowedSteps = new Set(steps.map((s) => s.key));

    const draft = safeParseDraft(draftKey ? localStorage.getItem(draftKey) : null);
    if (draft) {
      setCoreForm((prev) => ({
        ...prev,
        ...draft.coreForm,
        profilePhotoUrl: draft.coreForm.profilePhotoUrl || prev.profilePhotoUrl,
      }));
      setClubForm((prev) => ({ ...prev, ...draft.clubForm }));
      setClubReadinessForm((prev) => ({ ...prev, ...draft.clubReadinessForm }));
      setSwimForm((prev) => ({ ...prev, ...draft.swimForm }));
      setAcademyForm((prev) => ({ ...prev, ...draft.academyForm }));
      setSignalsForm((prev) => ({ ...prev, ...draft.signalsForm }));

      if (requestedStep && allowedSteps.has(requestedStep)) {
        setCurrentStep(requestedStep);
      } else {
        setCurrentStep(
          allowedSteps.has(draft.currentStep) ? draft.currentStep : firstIncompleteStep(),
        );
        toast.message("Restored your in-progress onboarding");
      }
      return;
    }

    if (requestedStep && allowedSteps.has(requestedStep)) {
      setCurrentStep(requestedStep);
    } else {
      setCurrentStep(firstIncompleteStep());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    member,
    needsAcademyReadiness,
    needsClubReadiness,
    needsCoreProfile,
    needsSafetyLogistics,
    needsSwimBackground,
    searchParams,
    steps,
    draftKey,
  ]);

  // ── Nav helpers ───────────────────────────────────────────────────
  const prevStepKey = steps[stepIndex - 1]?.key;
  const canGoBack = Boolean(prevStepKey);
  const goBack = () => {
    if (prevStepKey) setCurrentStep(prevStepKey);
  };

  // ── Render ────────────────────────────────────────────────────────
  if (loading) {
    return <LoadingCard text="Loading onboarding..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="error" title="Onboarding error">
          {error}
        </Alert>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Onboarding</h1>
        <p className="text-slate-600">
          Let’s get you set up properly. This takes about 3–5 minutes.
        </p>
      </header>

      <ProgressHeader
        currentNumber={currentNumber}
        stepCount={stepCount}
        currentStepTitle={currentStepTitle}
        progressPercent={progressPercent}
      />

      {wantsAcademy &&
      member?.membership?.requested_tiers &&
      member.membership.requested_tiers.length > 0 ? (
        <Card className="p-4 space-y-1">
          <p className="text-sm font-medium text-slate-900">Your selection is saved</p>
          <p className="text-sm text-slate-600">
            You selected Academy during signup. Completing readiness here helps us support you and
            speed up the next steps.
          </p>
        </Card>
      ) : null}

      <Card className="p-6 space-y-6">
        {currentStep === "core" ? (
          <CoreStep
            coreForm={coreForm}
            setCoreForm={setCoreForm}
            saving={saving}
            setSaving={setSaving}
          />
        ) : null}

        {currentStep === "safety" ? (
          <ClubDetailsStep
            mode="onboarding"
            includeNotesField={false}
            formData={clubForm}
            onUpdate={(field, value) =>
              setClubForm((prev) => ({ ...prev, [field]: value as any }))
            }
            onToggleMulti={(field, option) => {
              if (field === "locationPreference" || field === "timeOfDayAvailability") {
                toggleClubMulti(field, option);
              }
            }}
          />
        ) : null}

        {currentStep === "swim" ? (
          <SwimBackgroundStep
            formData={swimForm}
            onUpdate={(field, value) =>
              setSwimForm((prev) => ({ ...prev, [field]: value as any }))
            }
            onToggleStroke={toggleStroke}
            onToggleGoal={toggleGoal}
          />
        ) : null}

        {currentStep === "club" ? (
          <ClubReadinessStep
            formData={clubReadinessForm}
            onToggleAvailability={toggleClubReadinessMulti}
            onUpdateNotes={(value) =>
              setClubReadinessForm((prev) => ({ ...prev, clubNotes: value }))
            }
          />
        ) : null}

        {currentStep === "academy" ? (
          <AcademyDetailsStep
            formData={academyForm}
            onUpdate={(field, value) =>
              setAcademyForm((prev) => ({ ...prev, [field]: value as any }))
            }
          />
        ) : null}

        {currentStep === "signals" ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900">
                  Community signals (optional)
                </h2>
                <p className="text-sm text-slate-600">
                  Light preferences so we can personalize your experience.
                </p>
              </div>
              <Button variant="outline" type="button" onClick={() => setCurrentStep("review")}>
                Skip
              </Button>
            </div>
            <CommunitySignalsStep
              showHeader={false}
              formData={signalsForm}
              onToggleMulti={toggleSignalsMulti}
            />
          </div>
        ) : null}

        {currentStep === "review" ? (
          <ReviewStep
            hasMissingRequiredSteps={hasMissingRequiredSteps}
            missingRequiredSteps={missingRequiredSteps}
            firstMissingRequiredStep={firstMissingRequiredStep}
            onJumpToStep={setCurrentStep}
            reviewDescription={reviewDescription}
            showBillingCta={showBillingCta}
            billingCtaLabel={billingCtaLabel}
            navigatingToBilling={navigatingToBilling}
            onActivate={() => {
              setNavigatingToBilling(true);
              router.push(billingHref);
            }}
          />
        ) : null}

        {currentStep !== "review" ? (
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={goBack} disabled={!canGoBack || saving}>
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={
                saving ||
                (currentStep === "core" && !coreFormValid) ||
                (currentStep === "safety" && !safetyFormValid) ||
                (currentStep === "swim" && !swimFormValid) ||
                (currentStep === "club" && !clubReadinessValid) ||
                (currentStep === "academy" && !academyFormValid)
              }
            >
              {saving ? "Saving..." : currentStep === "signals" ? "Continue" : "Save & continue"}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
