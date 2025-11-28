"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { TierSelectionStep } from "@/components/registration/TierSelectionStep";
import { CoreProfileStep } from "@/components/registration/CoreProfileStep";
import { ClubDetailsStep } from "@/components/registration/ClubDetailsStep";
import { AcademyDetailsStep } from "@/components/registration/AcademyDetailsStep";
import { VolunteerInterestsStep } from "@/components/registration/VolunteerInterestsStep";
import { ReviewConfirmStep } from "@/components/registration/ReviewConfirmStep";
import { apiEndpoints } from "@/lib/config";
import clsx from "clsx";

type Tier = "community" | "club" | "academy";

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

  // Volunteer & Interests (Step 5)
  volunteerInterest: string[];
  interestTags: string[];
  showInDirectory: boolean;
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
};

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Determine which steps to show based on selected tier
  const getSteps = () => {
    const steps = [
      { id: 1, title: "Choose Tier", required: true },
      { id: 2, title: "Core Profile", required: true },
    ];

    if (formData.membershipTier === "club" || formData.membershipTier === "academy") {
      steps.push({ id: 3, title: "Club Details", required: true });
    }

    if (formData.membershipTier === "academy") {
      steps.push({ id: 4, title: "Academy Details", required: true });
    }

    steps.push({ id: 5, title: "Volunteer & Interests", required: false });
    steps.push({ id: 6, title: "Review & Confirm", required: true });

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
    const stepId = steps[currentStep].id;

    switch (stepId) {
      case 1: // Tier Selection
        return formData.membershipTier !== null;

      case 2: // Core Profile
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

      case 3: // Club Details
        return Boolean(
          formData.emergencyContactName &&
          formData.emergencyContactRelationship &&
          formData.emergencyContactPhone &&
          formData.locationPreference.length > 0 &&
          formData.timeOfDayAvailability.length > 0
        );

      case 4: // Academy Details
        return Boolean(
          formData.academyGoals &&
          formData.academyPreferredCoachGender &&
          formData.academyLessonPreference
        );

      case 5: // Volunteer & Interests
        return true; // Optional step

      case 6: // Review & Confirm
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
        password: formData.password,
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

        // Club (if applicable)
        ...(formData.membershipTier === "club" || formData.membershipTier === "academy" ? {
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_relationship: formData.emergencyContactRelationship,
          emergency_contact_phone: formData.emergencyContactPhone,
          medical_info: formData.medicalInfo,
          location_preference: formData.locationPreference,
          time_of_day_availability: formData.timeOfDayAvailability,
          consent_photo: formData.consentPhoto,
        } : {}),

        // Academy (if applicable)
        ...(formData.membershipTier === "academy" ? {
          academy_skill_assessment: formData.academySkillAssessment,
          academy_goals: formData.academyGoals,
          academy_preferred_coach_gender: formData.academyPreferredCoachGender,
          academy_lesson_preference: formData.academyLessonPreference,
        } : {}),

        // Volunteer
        volunteer_interest: formData.volunteerInterest,
      };

      // Submit to API
      const response = await fetch(apiEndpoints.pendingRegistrations, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Registration failed");
      }

      // Success - redirect or show confirmation
      router.push("/register/success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete registration.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    const stepId = steps[currentStep].id;

    switch (stepId) {
      case 1:
        return (
          <TierSelectionStep
            selectedTier={formData.membershipTier}
            onSelectTier={(tier) => updateField("membershipTier", tier)}
          />
        );

      case 2:
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

      case 3:
        return (
          <ClubDetailsStep
            formData={{
              emergencyContactName: formData.emergencyContactName,
              emergencyContactRelationship: formData.emergencyContactRelationship,
              emergencyContactPhone: formData.emergencyContactPhone,
              medicalInfo: formData.medicalInfo,
              locationPreference: formData.locationPreference,
              timeOfDayAvailability: formData.timeOfDayAvailability,
              consentPhoto: formData.consentPhoto,
            }}
            onUpdate={updateField}
            onToggleMulti={toggleMultiValue}
          />
        );

      case 4:
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

      case 5:
        return (
          <VolunteerInterestsStep
            formData={{
              volunteerInterest: formData.volunteerInterest,
              interestTags: formData.interestTags,
              showInDirectory: formData.showInDirectory,
            }}
            onToggleMulti={toggleMultiValue}
            onUpdate={updateField}
          />
        );

      case 6:
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      {/* Header */}
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Join SwimBuddz
        </p>
        <h1 className="text-4xl font-bold text-slate-900">Tier-Based Registration</h1>
        <p className="text-base text-slate-600">
          Choose your membership tier and complete your profile in just a few steps.
        </p>
      </header>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const state =
            index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
                    state === "current" && "border-cyan-500 bg-white text-cyan-700",
                    state === "upcoming" && "border-slate-300 bg-white text-slate-400"
                  )}
                >
                  {index + 1}
                </span>
                <span className="mt-2 hidden text-xs font-medium text-slate-700 sm:block">
                  {step.title}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={clsx(
                    "mx-2 h-0.5 flex-1",
                    state === "complete" ? "bg-emerald-300" : "bg-slate-200"
                  )}
                />
              )}
            </div>
          );
        })}
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
  );
}
