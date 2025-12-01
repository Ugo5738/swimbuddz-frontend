"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { TierSelectionStep } from "@/components/registration/TierSelectionStep";
import { CoreProfileStep } from "@/components/registration/CoreProfileStep";
import { ClubDetailsStep } from "@/components/registration/ClubDetailsStep";
import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { VolunteerInterestsStep } from "@/components/registration/VolunteerInterestsStep";
import { ReviewConfirmStep } from "@/components/registration/ReviewConfirmStep";
import { apiEndpoints } from "@/lib/config";
import { apiGet, apiPatch } from "@/lib/api";
import clsx from "clsx";

type Tier = "community" | "club" | "academy";
type StepKey = "tier" | "core" | "club" | "academy" | "volunteer" | "review";

type Step = {
  key: StepKey;
  title: string;
  required: boolean;
};

interface FormData {
  // Tier
  membershipTier: Tier | null;

  // Core Profile (Step 2)
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

  // Club Details (Step 3)
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  medicalInfo: string;
  locationPreference: string[];
  timeOfDayAvailability: string[];
  consentPhoto: string;
  clubNotes: string;

  // Academy Details (Step 4)
  academySkillAssessment: {
    canFloat: boolean;
    headUnderwater: boolean;
    deepWaterComfort: boolean;
    canSwim25m: boolean;
  };
  academyGoals: string;
  academyPreferredCoachGender: string;
  academyLessonPreference: string;
  academyProgram: string;
  academyLevel: string;
  academyGoal: string;
  academySchedule: string;
  academyNotes: string;

  // Volunteer & Interests (Step 5)
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
  clubNotes: "", // New field
  academySkillAssessment: {
    canFloat: false,
    headUnderwater: false,
    deepWaterComfort: false,
    canSwim25m: false,
  },
  academyGoals: "",
  academyPreferredCoachGender: "",
  academyLessonPreference: "",
  academyProgram: "", // New field
  academyLevel: "", // New field
  academyGoal: "", // New field
  academySchedule: "", // New field
  academyNotes: "", // New field
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
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUpgrade = searchParams.get("upgrade") === "true";

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTier, setCurrentTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (isUpgrade) {
      setLoadingProfile(true);
      apiGet<any>("/api/v1/members/me", { auth: true })
        .then((profile) => {
          console.log("Fetched profile for upgrade:", profile);
          const tier = profile.membership_tier || (profile.membership_tiers && profile.membership_tiers[0]);
          setCurrentTier((tier?.toLowerCase() as Tier) || null);
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
          }));
        })
        .catch((err) => {
          console.error("Failed to fetch profile for upgrade:", err);
          setErrorMessage("Failed to load your profile. Please try again.");
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [isUpgrade]);

  // Determine which steps to show based on selected tier
  const getSteps = (): Step[] => {
    const steps: Step[] = [
      { key: "tier", title: "Choose Tier", required: true },
      { key: "core", title: "Core Profile", required: true },
    ];

    if (formData.membershipTier === "club" || formData.membershipTier === "academy") {
      steps.push({ key: "club", title: "Club Details", required: true });
    }

    if (formData.membershipTier === "academy") {
      steps.push({ key: "academy", title: "Academy Details", required: true });
    }

    steps.push({ key: "volunteer", title: "Volunteer & Interests", required: false });
    steps.push({ key: "review", title: "Review & Confirm", required: true });

    return steps;
  };

  const steps = getSteps();
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

      case "core":
        return Boolean(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password && formData.password.length >= 8 &&
          formData.phone &&
          formData.gender &&
          formData.dateOfBirth &&
          formData.city &&
          formData.country &&
          formData.swimLevel &&
          formData.discoverySource &&
          formData.profilePhotoUrl // Photo is required
        );

      case "club":
        return Boolean(
          formData.emergencyContactName &&
          formData.emergencyContactRelationship &&
          formData.emergencyContactPhone &&
          formData.locationPreference.length > 0 &&
          formData.timeOfDayAvailability.length > 0
        );

      case "academy":
        return Boolean(
          formData.academyGoals &&
          formData.academyPreferredCoachGender &&
          formData.academyLessonPreference
        );

      case "volunteer":
        return true; // Optional step

      case "review":
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
      // Prepare payload for backend
      const payload = {
        // Core fields
        email: formData.email,
        // password: formData.password, // Don't send password on update unless changed (TODO: handle password change separately)
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,

        // Tier
        membership_tier: formData.membershipTier,

        // Profile
        profile_photo_url: formData.profilePhotoUrl,
        gender: formData.gender,
        date_of_birth: formData.dateOfBirth,
        swim_level: formData.swimLevel,
        discovery_source: formData.discoverySource,

        // Community
        show_in_directory: formData.showInDirectory,
        interest_tags: formData.interestTags,
        interests: formData.interestTags, // Map tags to main interests field for profile display
        consent_photo: formData.consentPhoto, // Send for all tiers
        social_instagram: formData.socialInstagram,
        social_linkedin: formData.socialLinkedIn,
        social_other: formData.socialOther,
        language_preference: formData.languagePreference,
        comms_preference: formData.commsPreference,
        payment_readiness: formData.paymentReadiness,
        currency_preference: formData.currencyPreference,
        payment_notes: formData.paymentNotes,

        // Club (if applicable)
        ...(formData.membershipTier === "club" || formData.membershipTier === "academy" ? {
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_relationship: formData.emergencyContactRelationship,
          emergency_contact_phone: formData.emergencyContactPhone,
          medical_info: formData.medicalInfo,
          location_preference: formData.locationPreference,
          time_of_day_availability: formData.timeOfDayAvailability,
          club_notes: formData.clubNotes, // Pass club notes
        } : {}),

        // Academy (if applicable)
        ...(formData.membershipTier === "academy" ? {
          academy_skill_assessment: formData.academySkillAssessment,
          academy_goals: formData.academyGoals,
          academy_preferred_coach_gender: formData.academyPreferredCoachGender,
          academy_lesson_preference: formData.academyLessonPreference,
          // Pass other academy fields if they are used in the future
          academy_program: formData.academyProgram,
          academy_level: formData.academyLevel,
          academy_goal: formData.academyGoal,
          academy_schedule: formData.academySchedule,
          academy_notes: formData.academyNotes,
        } : {}),

        // Volunteer
        volunteer_interest: formData.volunteerInterest,
      };

      if (isUpgrade) {
        // Use PATCH for upgrades
        await apiPatch("/api/v1/members/me", payload, { auth: true });
        router.push("/profile");
      } else {
        // Use POST for new registrations
        // Include password for new registrations
        const registrationPayload = { ...payload, password: formData.password };

        const response = await fetch(apiEndpoints.pendingRegistrations, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registrationPayload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Registration failed");
        }

        // Success - redirect or show confirmation
        router.push("/register/success");
      }
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

      case "core":
        return (
          <CoreProfileStep
            formData={{
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              password: formData.password,
              phone: formData.phone,
              gender: formData.gender,
              dateOfBirth: formData.dateOfBirth,
              city: formData.city,
              country: formData.country,
              swimLevel: formData.swimLevel,
              discoverySource: formData.discoverySource,
              profilePhotoUrl: formData.profilePhotoUrl,
            }}
            onUpdate={updateField}
          />
        );

      case "club":
        return (
          <ClubDetailsStep
            formData={{
              emergencyContactName: formData.emergencyContactName,
              emergencyContactRelationship: formData.emergencyContactRelationship,
              emergencyContactPhone: formData.emergencyContactPhone,
              medicalInfo: formData.medicalInfo,
              locationPreference: formData.locationPreference,
              timeOfDayAvailability: formData.timeOfDayAvailability,
              clubNotes: formData.clubNotes || "",
            }}
            onUpdate={updateField}
            onToggleMulti={toggleMultiValue}
          />
        );

      case "academy":
        return (
          <AcademyDetailsStep
            formData={{
              academySkillAssessment: formData.academySkillAssessment,
              academyGoals: formData.academyGoals,
              academyPreferredCoachGender: formData.academyPreferredCoachGender,
              academyLessonPreference: formData.academyLessonPreference,
            }}
            onUpdate={updateField}
          />
        );

      case "volunteer":
        return (
          <VolunteerInterestsStep
            formData={{
              volunteerInterest: formData.volunteerInterest,
              interestTags: formData.interestTags,
              showInDirectory: formData.showInDirectory,
              socialInstagram: formData.socialInstagram || "",
              socialLinkedIn: formData.socialLinkedIn || "",
              socialOther: formData.socialOther || "",
              languagePreference: formData.languagePreference,
              commsPreference: formData.commsPreference,
              paymentReadiness: formData.paymentReadiness,
              currencyPreference: formData.currencyPreference,
              paymentNotes: formData.paymentNotes || "",
              consentPhoto: formData.consentPhoto,
            }}
            onToggleMulti={toggleMultiValue}
            onUpdate={updateField}
          />
        );

      case "review":
        return (
          <ReviewConfirmStep
            formData={formData}
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
            {isUpgrade ? "Upgrade Membership" : "Join SwimBuddz"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isUpgrade
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
