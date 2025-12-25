"use client";

import { RegistrationConfirmStep } from "@/components/registration/RegistrationConfirmStep";
import { RegistrationEssentialsStep } from "@/components/registration/RegistrationEssentialsStep";
import { TierSelectionStep } from "@/components/registration/TierSelectionStep";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { createPendingRegistration } from "@/lib/registration";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type Tier = "community" | "club" | "academy";
type StepKey = "tier" | "essentials" | "confirm";

type Step = {
  key: StepKey;
  title: string;
  required: boolean;
};

interface FormData {
  // Tier
  membershipTier: Tier | null;

  // Account Essentials
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  city: string;
  country: string;
  swimLevel: string;
  discoverySource: string;
  profilePhotoUrl?: string;

  // Club Readiness
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  medicalInfo: string;
  locationPreference: string[];
  timeOfDayAvailability: string[];
  consentPhoto: string;
  clubNotes: string;
  availabilitySlots: string[];

  // Academy Readiness
  academySkillAssessment: {
    canFloat: boolean;
    headUnderwater: boolean;
    deepWaterComfort: boolean;
    canSwim25m: boolean;
  };
  academyGoals: string;
  academyPreferredCoachGender: string;
  academyLessonPreference: string;

  // Volunteer & Interests (post-registration)
  volunteerInterest: string[];
  interestTags: string[];
  showInDirectory: boolean;
  socialInstagram?: string;
  socialLinkedIn?: string;
  socialOther?: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  paymentNotes?: string;

  // About You (optional vetting)
  occupation?: string;
  areaInLagos?: string;
  howFoundUs?: string;
  previousCommunities?: string;
  hopesFromSwimbuddz?: string;
  communityRulesAccepted?: boolean;
}

const initialFormData: FormData = {
  membershipTier: null,
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  city: "",
  country: "Nigeria",
  swimLevel: "",
  discoverySource: "",
  profilePhotoUrl: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhone: "",
  medicalInfo: "",
  locationPreference: [],
  timeOfDayAvailability: [],
  consentPhoto: "yes",
  clubNotes: "",
  availabilitySlots: [],
  academySkillAssessment: {
    canFloat: false,
    headUnderwater: false,
    deepWaterComfort: false,
    canSwim25m: false,
  },
  academyGoals: "",
  academyPreferredCoachGender: "",
  academyLessonPreference: "",
  volunteerInterest: [],
  interestTags: [],
  showInDirectory: true, // Default to opted-in
  socialInstagram: "", // New field
  socialLinkedIn: "", // New field
  socialOther: "", // New field
  languagePreference: "english", // New field
  commsPreference: "whatsapp", // New field
  paymentReadiness: "ready_now", // New field
  currencyPreference: "NGN", // New field
  paymentNotes: "", // New field
  // About You
  occupation: "",
  areaInLagos: "",
  howFoundUs: "",
  previousCommunities: "",
  hopesFromSwimbuddz: "",
  communityRulesAccepted: false,
};

function expandTier(tier: Tier): Tier[] {
  if (tier === "academy") return ["academy", "club", "community"];
  if (tier === "club") return ["club", "community"];
  return ["community"];
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpgrade = searchParams.get("upgrade") === "true";
  const isCoachRegistration = searchParams.get("coach") === "true";

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);
  const [currentTiers, setCurrentTiers] = useState<Tier[]>([]);

  useEffect(() => {
    if (isUpgrade) {
      setLoadingProfile(true);
      apiGet<any>("/api/v1/members/me", { auth: true })
        .then((profile) => {
          console.log("Fetched profile for upgrade:", profile);
          const rawTiers: string[] =
            (profile.membership_tiers && profile.membership_tiers.length > 0
              ? profile.membership_tiers
              : profile.membership_tier
                ? [profile.membership_tier]
                : ["community"]).map((t: string) => t.toLowerCase());
          const normalizedTiers = rawTiers.filter((t) =>
            ["community", "club", "academy"].includes(t)
          ) as Tier[];
          setCurrentTiers(normalizedTiers);
          setCurrentTier(normalizedTiers[0] || null);
          setFormData((prev) => ({
            ...prev,
            membershipTier: null, // Force selection of new tier
            firstName: profile.first_name || "",
            lastName: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            gender: profile.gender || "",
            dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split("T")[0] : "",
            city: profile.city || "",
            country: profile.country || "Nigeria",
            swimLevel: profile.swim_level || "",
            discoverySource: profile.discovery_source || "",
            profilePhotoUrl: profile.profile_photo_url || "",
            emergencyContactName: profile.emergency_contact_name || "",
            emergencyContactRelationship: profile.emergency_contact_relationship || "",
            emergencyContactPhone: profile.emergency_contact_phone || "",
            medicalInfo: profile.medical_info || "",
            locationPreference: profile.location_preference || [],
            timeOfDayAvailability: profile.time_of_day_availability || [],
            consentPhoto: profile.consent_photo || "yes",
            academySkillAssessment: profile.academy_skill_assessment || initialFormData.academySkillAssessment,
            academyGoals: profile.academy_goals || "",
            academyPreferredCoachGender: profile.academy_preferred_coach_gender || "",
            academyLessonPreference: profile.academy_lesson_preference || "",
            volunteerInterest: profile.volunteer_interest || [],
            interestTags: profile.interest_tags || [],
            showInDirectory: profile.show_in_directory ?? true,
            availabilitySlots: profile.availability_slots || [],
          }));
        })
        .catch((err) => {
          console.error("Failed to fetch profile for upgrade:", err);
          setErrorMessage("Failed to load your profile. Please try again.");
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [isUpgrade]);

  // Determine which steps to show based on mode and selected tier
  const steps = useMemo<Step[]>(() => {
    if (isUpgrade) {
      // Upgrade mode only needs tier selection - we redirect to onboarding after
      return [
        { key: "tier", title: "Choose Tier", required: true },
      ];
    }

    if (isCoachRegistration) {
      // Coach registration only needs account creation - no tier selection
      return [
        { key: "essentials", title: "Create Account", required: true },
      ];
    }

    return [
      { key: "tier", title: "Choose Tier", required: true },
      { key: "essentials", title: "Create Account", required: true },
      { key: "confirm", title: "Confirm & Finish", required: true },
    ];
  }, [isUpgrade, isCoachRegistration, formData.membershipTier]);

  // Clamp the current step if the visible steps shrink (e.g. switching from academy to community)
  useEffect(() => {
    if (currentStep >= steps.length) {
      setCurrentStep(Math.max(steps.length - 1, 0));
    }
  }, [steps.length, currentStep]);

  const totalSteps = steps.length;

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleMultiValue = (field: string, option: string) => {
    setFormData((prev) => {
      const currentArray = prev[field as keyof FormData] as string[];
      const exists = currentArray.includes(option);
      const nextValue = exists
        ? currentArray.filter((item) => item !== option)
        : [...currentArray, option];
      return { ...prev, [field]: nextValue };
    });
  };

  const isStepValid = (): boolean => {
    const stepKey = steps[currentStep].key;

    switch (stepKey) {
      case "tier":
        return formData.membershipTier !== null;

      case "essentials":
        return Boolean(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password && formData.password.length >= 8 &&
          formData.phone &&
          formData.city &&
          formData.country &&
          formData.swimLevel
        );

      case "confirm":
        return acceptedTerms;

      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setSubmitting(true);

    try {
      if (isUpgrade) {
        if (!formData.membershipTier) {
          throw new Error("Please select a tier to upgrade to.");
        }

        // Save the requested tier to member profile
        const requestedTiers = expandTier(formData.membershipTier);

        await apiPatch("/api/v1/members/me", {
          requested_membership_tiers: requestedTiers,
        }, { auth: true });

        // Redirect to onboarding with the appropriate step
        const step = formData.membershipTier === "academy" ? "academy" : "club";
        router.push(`/dashboard/onboarding?step=${step}`);
        return;
      }

      if (!formData.membershipTier && !isCoachRegistration) {
        throw new Error("Please select a membership tier.");
      }

      // Coach registration - create minimal account and redirect to /coach/apply
      if (isCoachRegistration) {
        const coachRegistrationPayload = {
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName,
          password: formData.password,
          phone: formData.phone || undefined,
          city: formData.city || undefined,
          country: formData.country || "Nigeria",
          swim_level: "not_applicable",
          membership_tier: "community",
          membership_tiers: ["community"],
          roles: ["coach"],
          community_rules_accepted: true,
        };

        await createPendingRegistration(coachRegistrationPayload as any);
        router.push("/register/success?redirect=/coach/apply");
        return;
      }

      const selectedTier = formData.membershipTier!;
      const requestedTiers =
        selectedTier === "community" ? undefined : expandTier(selectedTier);

      const registrationPayload = {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        password: formData.password,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,
        area_in_lagos: formData.areaInLagos || undefined,
        swim_level: formData.swimLevel,
        // Always allow account access after email verification; tier upgrades are handled separately.
        membership_tier: "community",
        membership_tiers: ["community"],
        requested_membership_tiers: requestedTiers,
        community_rules_accepted: true,
      };

      await createPendingRegistration(registrationPayload as any);

      router.push("/register/success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete registration.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepKey = steps[currentStep].key;

    switch (stepKey) {
      case "tier":
        return (
          <TierSelectionStep
            selectedTier={formData.membershipTier}
            onSelectTier={(tier) => updateField("membershipTier", tier)}
            disabledTier={currentTier}
          />
        );

      case "essentials":
        return (
          <RegistrationEssentialsStep
            formData={{
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              password: formData.password,
              phone: formData.phone,
              areaInLagos: formData.areaInLagos,
              city: formData.city,
              country: formData.country,
              swimLevel: formData.swimLevel,
            }}
            onUpdate={updateField}
          />
        );



      case "confirm":
        return (
          <RegistrationConfirmStep
            selectedTier={formData.membershipTier}
            firstName={formData.firstName}
            lastName={formData.lastName}
            email={formData.email}
            acceptedTerms={acceptedTerms}
            onAcceptTerms={setAcceptedTerms}
          />
        );

      default:
        return null;
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600"></div>
          <p className="mt-4 text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isCoachRegistration
              ? "Create Coach Account"
              : isUpgrade
                ? "Upgrade Membership"
                : "Join SwimBuddz"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isCoachRegistration
              ? "Create an account to apply as a SwimBuddz coach."
              : isUpgrade
                ? "Select a new tier to upgrade your membership."
                : "Become part of our thriving swimming community."}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="absolute left-0 top-1/2 -z-10 h-0.5 w-full bg-slate-200" />
          <div className="flex justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.key} className="flex flex-col items-center gap-2 bg-slate-50 px-2">
                  <div
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-cyan-600 text-white ring-4 ring-cyan-100"
                        : isCompleted
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-200 text-slate-500"
                    )}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>
                  <span
                    className={clsx(
                      "hidden text-xs font-medium sm:block",
                      isActive ? "text-cyan-700" : isCompleted ? "text-cyan-600" : "text-slate-500"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <Alert variant="error" title="Registration Error">
            {errorMessage}
          </Alert>
        )}

        {/* Step Content */}
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {steps[currentStep].title}
            </h2>
          </div>

          {renderStep()}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between gap-4">
            <Button
              onClick={goBack}
              variant="secondary"
              disabled={currentStep === 0}
            >
              Back
            </Button>

            <Button
              onClick={goNext}
              disabled={!isStepValid() || submitting}
            >
              {currentStep === totalSteps - 1
                ? submitting
                  ? "Submitting..."
                  : "Submit Registration"
                : "Next Step"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading registration..." />}>
      <RegisterContent />
    </Suspense>
  );
}
