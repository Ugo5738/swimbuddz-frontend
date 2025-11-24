"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { phoneCodes } from "@/lib/phoneCodes";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PasswordField } from "@/components/ui/PasswordField";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { registerMember, type RegistrationPayload } from "@/lib/registration";
import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";
import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { SingleSelectPills } from "@/components/forms/SingleSelectPills";
import {
  strokesOptions,
  interestOptions,
  certificationOptions,
  coachingSpecialtyOptions,
  travelFlexibilityOptions,
  membershipTierOptions,
  paymentReadinessOptions,
  volunteerInterestOptions,
  academyFocusOptions,
  facilityAccessOptions,
  equipmentNeedsOptions,
  availabilityOptions,
  timeOfDayOptions,
  locationOptions,
  countryOptions,
  discoverySourceOptions,
  currencyOptions
} from "@/lib/options";

const steps = [
  {
    title: "Basic info",
    description: "Tell us where you are in the world so we can match you with the right city and time zone."
  },
  {
    title: "Experience & goals",
    description: "Share your swim background, preferred strokes, and any certifications."
  },
  {
    title: "Logistics",
    description: "Availability, locations, and travel readiness keep planning simple."
  },
  { title: "Safety", description: "Emergency contacts and medical notes stay confidential with our admins." },
  {
    title: "Community & consents",
    description: "Let us know how you want to engage, pay, and which tiers you want to join."
  },
  { title: "Agreements", description: "Confirm that you’ve read our guidelines and privacy commitments." }
];

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneCountryCode: string;
  phone: string;
  city: string;
  country: string;
  timeZone: string;
  swimLevel: string;
  deepWaterComfort: string;
  strokes: string[];
  interests: string[];
  goalsNarrative: string;
  goalsOther: string;
  certifications: string[];
  coachingExperience: string;
  coachingSpecialties: string[];
  coachingYears: string;
  coachingPortfolioLink: string;
  coachingDocumentLink: string;
  coachingDocumentFileName: string;
  availabilitySlots: string[];
  timeOfDayAvailability: string[];
  locationPreference: string[];
  locationPreferenceOther: string;
  travelFlexibility: string;
  facilityAccess: string[];
  facilityAccessOther: string;
  equipmentNeeds: string[];
  equipmentNeedsOther: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhoneCountryCode: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string[];
  volunteerRolesDetail: string;
  discoverySource: string;
  socialInstagram: string;
  socialLinkedIn: string;
  socialOther: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocusAreas: string[];
  academyFocus: string;
  paymentNotes: string;
  acceptedGuidelines: boolean;
  acceptedPrivacy: boolean;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phoneCountryCode: "+234",
  phone: "",
  city: "",
  country: "Nigeria",
  timeZone: "Africa/Lagos",
  swimLevel: "",
  deepWaterComfort: "",
  strokes: [],
  interests: [],
  goalsNarrative: "",
  goalsOther: "",
  certifications: [],
  coachingExperience: "",
  coachingSpecialties: [],
  coachingYears: "",
  coachingPortfolioLink: "",
  coachingDocumentLink: "",
  coachingDocumentFileName: "",
  availabilitySlots: [],
  timeOfDayAvailability: [],
  locationPreference: [],
  locationPreferenceOther: "",
  travelFlexibility: "",
  facilityAccess: [],
  facilityAccessOther: "",
  equipmentNeeds: [],
  equipmentNeedsOther: "",
  travelNotes: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhoneCountryCode: "+234",
  emergencyContactPhone: "",
  emergencyContactRegion: "",
  medicalInfo: "",
  safetyNotes: "",
  volunteerInterest: [],
  volunteerRolesDetail: "",
  discoverySource: "",
  socialInstagram: "",
  socialLinkedIn: "",
  socialOther: "",
  languagePreference: "English",
  commsPreference: "whatsapp",
  paymentReadiness: "",
  currencyPreference: "NGN",
  consentPhoto: "yes",
  membershipTiers: [],
  academyFocusAreas: [],
  academyFocus: "",
  paymentNotes: "",
  acceptedGuidelines: false,
  acceptedPrivacy: false
};

type MultiValueField =
  | "strokes"
  | "interests"
  | "certifications"
  | "membershipTiers"
  | "coachingSpecialties"
  | "availabilitySlots"
  | "timeOfDayAvailability"
  | "locationPreference"
  | "facilityAccess"
  | "equipmentNeeds"
  | "volunteerInterest"
  | "academyFocusAreas";

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [dynamicTimeOptions, setDynamicTimeOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/sessions/");
        if (res.ok) {
          const sessions = await res.json();
          // Deduplicate by title to create options
          const uniqueTitles = new Set();
          const options: { value: string; label: string }[] = [];

          sessions.forEach((s: any) => {
            if (!uniqueTitles.has(s.title)) {
              uniqueTitles.add(s.title);
              // Create a value from title (slugify)
              const value = s.title.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, "");
              options.push({ value, label: s.title });
            }
          });

          if (options.length > 0) {
            setDynamicTimeOptions(options);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      }
    }
    fetchSessions();
  }, []);

  function updateField<T extends keyof FormState>(field: T, value: FormState[T]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function toggleMultiValue(field: MultiValueField, option: string) {
    setFormData((prev) => {
      const selected = prev[field];
      const exists = selected.includes(option);
      const nextValue = exists ? selected.filter((item) => item !== option) : [...selected, option];
      return { ...prev, [field]: nextValue };
    });
  }

  function formatPhoneInput(value: string) {
    const digitsOnly = value.replace(/[^\d]/g, "");
    return digitsOnly.replace(/^0+/, "");
  }

  function isStepValid() {
    switch (currentStep) {
      case 0:
        return Boolean(
          formData.firstName &&
          formData.lastName &&
          formData.email &&
          formData.password &&
          formData.phone &&
          formData.city &&
          formData.country &&
          formData.timeZone
        );
      case 1:
        const coachSelected = formData.certifications.includes("coach");
        const coachFieldsValid = coachSelected
          ? Boolean(
            formData.coachingExperience.trim() &&
            formData.coachingSpecialties.length > 0 &&
            formData.coachingYears
          )
          : true;
        return (
          Boolean(formData.swimLevel && formData.deepWaterComfort && formData.goalsNarrative) &&
          formData.strokes.length > 0 &&
          (formData.interests.length > 0 || Boolean(formData.goalsOther.trim())) &&
          coachFieldsValid
        );
      case 2:
        return (
          formData.availabilitySlots.length > 0 &&
          formData.timeOfDayAvailability.length > 0 &&
          (formData.locationPreference.length > 0 || Boolean(formData.locationPreferenceOther.trim())) &&
          Boolean(formData.travelFlexibility)
        );
      case 3:
        return Boolean(
          formData.emergencyContactName &&
          formData.emergencyContactRelationship &&
          formData.emergencyContactPhone &&
          formData.emergencyContactRegion
        );
      case 4:
        return (
          Boolean(
            formData.volunteerInterest.length &&
            formData.discoverySource &&
            formData.languagePreference &&
            formData.commsPreference &&
            formData.paymentReadiness &&
            formData.currencyPreference
          ) && formData.membershipTiers.length > 0
        );
      case 5:
        return formData.acceptedGuidelines && formData.acceptedPrivacy;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const payload: RegistrationPayload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: `${formData.phoneCountryCode} ${formData.phone}`.trim(),
        city: formData.city,
        country: formData.country,
        timeZone: formData.timeZone,
        swimLevel: formData.swimLevel,
        deepWaterComfort: formData.deepWaterComfort,
        strokes: formData.strokes,
        interests: formData.interests,
        goalsNarrative: formData.goalsNarrative,
        goalsOther: formData.goalsOther,
        certifications: formData.certifications,
        coachingExperience: formData.coachingExperience,
        coachingSpecialties: formData.coachingSpecialties,
        coachingYears: formData.coachingYears,
        coachingPortfolioLink: formData.coachingPortfolioLink,
        coachingDocumentLink: formData.coachingDocumentLink,
        coachingDocumentFileName: formData.coachingDocumentFileName,
        availabilitySlots: formData.availabilitySlots,
        timeOfDayAvailability: formData.timeOfDayAvailability,
        locationPreference: formData.locationPreference,
        locationPreferenceOther: formData.locationPreferenceOther,
        travelFlexibility: formData.travelFlexibility,
        facilityAccess: formData.facilityAccess,
        facilityAccessOther: formData.facilityAccessOther,
        equipmentNeeds: formData.equipmentNeeds,
        equipmentNeedsOther: formData.equipmentNeedsOther,
        travelNotes: formData.travelNotes,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        emergencyContactPhone: `${formData.emergencyContactPhoneCountryCode} ${formData.emergencyContactPhone}`.trim(),
        emergencyContactRegion: formData.emergencyContactRegion,
        medicalInfo: formData.medicalInfo,
        safetyNotes: formData.safetyNotes,
        volunteerInterest: formData.volunteerInterest,
        volunteerRolesDetail: formData.volunteerRolesDetail,
        discoverySource: formData.discoverySource,
        socialInstagram: formData.socialInstagram,
        socialLinkedIn: formData.socialLinkedIn,
        socialOther: formData.socialOther,
        languagePreference: formData.languagePreference,
        commsPreference: formData.commsPreference,
        paymentReadiness: formData.paymentReadiness,
        currencyPreference: formData.currencyPreference,
        consentPhoto: formData.consentPhoto,
        membershipTiers: formData.membershipTiers,
        academyFocusAreas: formData.academyFocusAreas,
        academyFocus: formData.academyFocus,
        paymentNotes: formData.paymentNotes
      } as const;

      const result = await registerMember(payload, formData.password);

      if (result.status === "email_confirmation_required") {
        setRegistrationSuccess(true);
        return;
      }

      router.push("/profile");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete registration.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((index) => index + 1);
    } else {
      void handleSubmit();
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setCurrentStep((index) => index - 1);
    }
  }

  if (registrationSuccess) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Join SwimBuddz</p>
          <h1 className="text-4xl font-bold text-slate-900">Global registration</h1>
        </header>
        <Alert variant="info" title="Registration successful">
          Check your email to confirm your account.
        </Alert>
        <Button onClick={() => router.push("/")} variant="secondary">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Join SwimBuddz</p>
        <h1 className="text-4xl font-bold text-slate-900">Global registration</h1>
        <p className="text-base text-slate-600">
          The six-step flow now captures members across countries, time zones, and tiers.
        </p>
      </header>

      <ol className="flex flex-col gap-4 md:flex-row md:items-center" aria-label="Registration progress">
        {steps.map((step, index) => {
          const state = index < currentStep ? "complete" : index === currentStep ? "current" : "upcoming";
          return (
            <li key={step.title} className="flex items-center gap-3 md:flex-1">
              <div className="flex items-center gap-3">
                <span
                  className={clsx(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                    state === "complete" && "border-emerald-500 bg-emerald-500 text-white",
                    state === "current" && "border-cyan-500 text-cyan-700",
                    state === "upcoming" && "border-slate-300 text-slate-400"
                  )}
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Step {index + 1}</p>
                  <p className="text-sm font-medium text-slate-900">{step.title}</p>
                </div>
              </div>
              {index < steps.length - 1 ? (
                <span
                  className={clsx(
                    "hidden flex-1 rounded-md border-b-2 md:block",
                    state === "complete" ? "border-emerald-300" : "border-slate-200"
                  )}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>

      {errorMessage ? (
        <Alert variant="error" title="Registration error">
          {errorMessage}
        </Alert>
      ) : null}

      {infoMessage ? (
        <Alert variant="info" title="Next step">
          {infoMessage}
        </Alert>
      ) : null}

      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">{steps[currentStep].title}</h2>
          <p className="text-sm text-slate-600">{steps[currentStep].description}</p>
        </div>

        <div className="space-y-4">
          {currentStep === 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="First name"
                  name="firstName"
                  placeholder="Ada"
                  value={formData.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  required
                />
                <Input
                  label="Last name"
                  name="lastName"
                  placeholder="Obi"
                  value={formData.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="ada@example.com"
                value={formData.email}
                onChange={(event) => updateField("email", event.target.value)}
                required
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="City"
                  name="city"
                  placeholder="Lagos"
                  value={formData.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  required
                />
                <Select
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={(event) => updateField("country", event.target.value)}
                  required
                >
                  <option value="">Select country</option>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <TimezoneCombobox
                label="Time zone"
                name="timeZone"
                value={formData.timeZone}
                onChange={(value) => updateField("timeZone", value)}
                required
              />
              <div className="space-y-1 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1">
                  Phone
                  <span aria-hidden="true" className="text-rose-500">
                    *
                  </span>
                </span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="sm:w-56">
                    <Select
                      label="Country code"
                      hideLabel
                      value={formData.phoneCountryCode}
                      onChange={(event) => updateField("phoneCountryCode", event.target.value)}
                      required
                    >
                      {phoneCodes.map((country) => (
                        <option key={country.code} value={country.dial_code}>
                          {country.name} ({country.dial_code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    label="Phone number"
                    hideLabel
                    name="phone"
                    placeholder="8012345678"
                    value={formData.phone}
                    onChange={(event) => updateField("phone", formatPhoneInput(event.target.value))}
                    required
                    className="flex-1"
                  />
                </div>
              </div>
              <PasswordField
                label="Password"
                name="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(event) => updateField("password", event.target.value)}
                required
              />
            </>
          )}

          {currentStep === 1 && (
            <>
              <Select
                label="Swimming level"
                name="swimLevel"
                value={formData.swimLevel}
                onChange={(event) => updateField("swimLevel", event.target.value)}
                required
              >
                <option value="">Select level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
              <Select
                label="Deep-water comfort"
                name="deepWaterComfort"
                value={formData.deepWaterComfort}
                onChange={(event) => updateField("deepWaterComfort", event.target.value)}
                required
              >
                <option value="">Select option</option>
                <option value="learning">Still learning</option>
                <option value="comfortable">Comfortable</option>
                <option value="expert">Expert</option>
              </Select>
              <OptionPillGroup
                label="Preferred strokes"
                options={strokesOptions}
                selected={formData.strokes}
                onToggle={(value) => toggleMultiValue("strokes", value)}
                required
                hint="Select all that apply"
              />
              <OptionPillGroup
                label="Interests & pathways"
                options={interestOptions}
                selected={formData.interests}
                onToggle={(value) => toggleMultiValue("interests", value)}
                required
                hint="Tell us what you’re most excited about"
              />
              <Textarea
                label="What are you hoping to achieve?"
                hint="Share global ambitions like racing goals, travel plans, or ways SwimBuddz can support you."
                name="goalsNarrative"
                rows={3}
                placeholder="Prep for triathlon, build open-water confidence, remote coaching, etc."
                value={formData.goalsNarrative}
                onChange={(event) => updateField("goalsNarrative", event.target.value)}
                required
              />
              <Textarea
                label="Additional interests (optional)"
                name="goalsOther"
                rows={3}
                placeholder="Anything else we should know?"
                value={formData.goalsOther}
                onChange={(event) => updateField("goalsOther", event.target.value)}
              />
              <OptionPillGroup
                label="Certifications / background"
                options={certificationOptions}
                selected={formData.certifications}
                onToggle={(value) => toggleMultiValue("certifications", value)}
                hint="Optional"
              />
              {formData.certifications.includes("coach") ? (
                <div className="space-y-4 rounded-md border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Coach verification</p>
                  <Textarea
                    label="Coaching background & philosophy"
                    rows={3}
                    placeholder="Share credentials, clubs, or focus areas"
                    value={formData.coachingExperience}
                    onChange={(event) => updateField("coachingExperience", event.target.value)}
                    required
                  />
                  <OptionPillGroup
                    label="Specialties"
                    options={coachingSpecialtyOptions}
                    selected={formData.coachingSpecialties}
                    onToggle={(value) => toggleMultiValue("coachingSpecialties", value)}
                    hint="Select all areas you support"
                    required
                  />
                  <Select
                    label="Years coaching"
                    value={formData.coachingYears}
                    onChange={(event) => updateField("coachingYears", event.target.value)}
                    required
                  >
                    <option value="">Select range</option>
                    <option value="under_1">Less than 1 year</option>
                    <option value="1_3">1 – 3 years</option>
                    <option value="3_5">3 – 5 years</option>
                    <option value="5_plus">5+ years</option>
                  </Select>
                  <Input
                    label="Portfolio / website (optional)"
                    type="url"
                    placeholder="https://coach.example.com"
                    value={formData.coachingPortfolioLink}
                    onChange={(event) => updateField("coachingPortfolioLink", event.target.value)}
                  />
                  <Input
                    label="Certification or credential link"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={formData.coachingDocumentLink}
                    onChange={(event) => updateField("coachingDocumentLink", event.target.value)}
                  />
                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Upload supporting document (PDF or image)</p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        updateField("coachingDocumentFileName", file ? file.name : "");
                      }}
                      className="text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-500"
                    />
                    {formData.coachingDocumentFileName ? (
                      <p className="text-xs text-slate-500">Selected: {formData.coachingDocumentFileName}</p>
                    ) : (
                      <p className="text-xs text-slate-500">You can skip upload and use the link field above if preferred.</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Uploaded files are stored securely; admins verify every coach credential before granting access.
                    </p>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {currentStep === 2 && (
            <>
              <OptionPillGroup
                label="Weekly availability"
                options={[
                  { value: "weekday_morning", label: "Weekday mornings" },
                  { value: "weekday_evening", label: "Weekday evenings" },
                  { value: "weekend_morning", label: "Weekend mornings" },
                  { value: "weekend_evening", label: "Weekend evenings" },
                  { value: "remote_friendly", label: "Remote / virtual" },
                  { value: "travel_ready", label: "Traveling often" }
                ]}
                selected={formData.availabilitySlots}
                onToggle={(value) => toggleMultiValue("availabilitySlots", value)}
                required
                hint="Select all that apply"
              />
              <OptionPillGroup
                label="Time-of-day preferences"
                options={dynamicTimeOptions.length > 0 ? dynamicTimeOptions : timeOfDayOptions}
                selected={formData.timeOfDayAvailability}
                onToggle={(value) => toggleMultiValue("timeOfDayAvailability", value)}
                required
              />
              <OptionPillGroup
                label="Preferred locations"
                options={[
                  { value: "ago", label: "Ago (Sunfit)" },
                  { value: "yaba", label: "Yaba (Rowe Park)" },
                  { value: "victoria_island", label: "Victoria Island (Federal Palace)" },
                  { value: "remote_global", label: "Remote / Global" },
                  { value: "traveling_locations", label: "Traveling locations" }
                ]}
                selected={formData.locationPreference}
                onToggle={(value) => toggleMultiValue("locationPreference", value)}
                hint="You can pick multiple cities or simply choose remote"
              />
              <Input
                label="Other location (optional)"
                placeholder="Add another city or area"
                value={formData.locationPreferenceOther}
                onChange={(event) => updateField("locationPreferenceOther", event.target.value)}
              />
              <Select
                label="Travel & relocation readiness"
                name="travelFlexibility"
                value={formData.travelFlexibility}
                onChange={(event) => updateField("travelFlexibility", event.target.value)}
                required
              >
                <option value="">Select readiness</option>
                {travelFlexibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <OptionPillGroup
                label="Facility / water access"
                options={[
                  { value: "city_pool", label: "City pool" },
                  { value: "club_pool", label: "Club pool" },
                  { value: "open_water", label: "Open water" },
                  { value: "home_pool", label: "Home pool" },
                  { value: "gym_pool", label: "Gym / hotel pool" },
                  { value: "other", label: "Other" }
                ]}
                selected={formData.facilityAccess}
                onToggle={(value) => toggleMultiValue("facilityAccess", value)}
                hint="Helps us host you locally"
              />
              {formData.facilityAccess.includes("other") ? (
                <Input
                  label="Describe facility access"
                  value={formData.facilityAccessOther}
                  onChange={(event) => updateField("facilityAccessOther", event.target.value)}
                />
              ) : null}
              <OptionPillGroup
                label="Equipment needs"
                options={[
                  { value: "fins", label: "Fins" },
                  { value: "snorkel", label: "Snorkel" },
                  { value: "paddles", label: "Paddles" },
                  { value: "buoy", label: "Pull buoy" },
                  { value: "wetsuit", label: "Wetsuit" },
                  { value: "other", label: "Other" }
                ]}
                selected={formData.equipmentNeeds}
                onToggle={(value) => toggleMultiValue("equipmentNeeds", value)}
                hint="Select the gear you'd like us to prep"
              />
              {formData.equipmentNeeds.includes("other") ? (
                <Input
                  label="Other equipment needs"
                  value={formData.equipmentNeedsOther}
                  onChange={(event) => updateField("equipmentNeedsOther", event.target.value)}
                />
              ) : null}
              <Textarea
                label="Travel notes (optional)"
                rows={2}
                placeholder="Visas, ride-share needs, recent travel"
                value={formData.travelNotes}
                onChange={(event) => updateField("travelNotes", event.target.value)}
              />
            </>
          )}

          {currentStep === 3 && (
            <>
              <Input
                label="Emergency contact name"
                value={formData.emergencyContactName}
                onChange={(event) => updateField("emergencyContactName", event.target.value)}
                required
              />
              <Input
                label="Relationship"
                value={formData.emergencyContactRelationship}
                onChange={(event) => updateField("emergencyContactRelationship", event.target.value)}
                required
              />
              <div className="space-y-1 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1">
                  Emergency phone
                  <span aria-hidden="true" className="text-rose-500">
                    *
                  </span>
                </span>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="sm:w-56">
                    <Select
                      label="Country code"
                      hideLabel
                      value={formData.emergencyContactPhoneCountryCode}
                      onChange={(event) => updateField("emergencyContactPhoneCountryCode", event.target.value)}
                      required
                    >
                      {phoneCodes.map((country) => (
                        <option key={country.code} value={country.dial_code}>
                          {country.name} ({country.dial_code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Input
                    label="Emergency contact phone"
                    hideLabel
                    value={formData.emergencyContactPhone}
                    onChange={(event) =>
                      updateField("emergencyContactPhone", formatPhoneInput(event.target.value))
                    }
                    required
                    className="flex-1"
                  />
                </div>
              </div>
              <Input
                label="Emergency contact region"
                placeholder="City, country"
                value={formData.emergencyContactRegion}
                onChange={(event) => updateField("emergencyContactRegion", event.target.value)}
                required
              />
              <Textarea
                label="Medical info"
                rows={3}
                placeholder="Asthma, allergies, past injuries"
                value={formData.medicalInfo}
                onChange={(event) => updateField("medicalInfo", event.target.value)}
              />
              <Textarea
                label="Safety notes (optional)"
                rows={3}
                placeholder="Any additional notes"
                value={formData.safetyNotes}
                onChange={(event) => updateField("safetyNotes", event.target.value)}
              />
            </>
          )}

          {currentStep === 4 && (
            <>
              <Select
                label="How did you discover SwimBuddz?"
                value={formData.discoverySource}
                onChange={(event) => updateField("discoverySource", event.target.value)}
                required
              >
                <option value="">Select source</option>
                {discoverySourceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Instagram handle"
                  placeholder="@swimbuddz"
                  value={formData.socialInstagram}
                  onChange={(event) => updateField("socialInstagram", event.target.value)}
                />
                <Input
                  label="LinkedIn / professional link"
                  placeholder="linkedin.com/in/you"
                  value={formData.socialLinkedIn}
                  onChange={(event) => updateField("socialLinkedIn", event.target.value)}
                />
                <Input
                  label="Other social link (optional)"
                  placeholder="TikTok, YouTube, blog"
                  value={formData.socialOther}
                  onChange={(event) => updateField("socialOther", event.target.value)}
                />
              </div>
              <Input
                label="Language preference"
                placeholder="English, French, Yoruba"
                value={formData.languagePreference}
                onChange={(event) => updateField("languagePreference", event.target.value)}
                required
              />
              <OptionPillGroup
                label="Volunteer interest / community roles"
                options={volunteerInterestOptions}
                selected={formData.volunteerInterest}
                onToggle={(value) => toggleMultiValue("volunteerInterest", value)}
                required
                hint="Pick all the areas you’re excited about"
              />
              <Textarea
                label="Specific roles you can support (optional)"
                rows={2}
                value={formData.volunteerRolesDetail}
                onChange={(event) => updateField("volunteerRolesDetail", event.target.value)}
              />
              <Select
                label="Preferred communication channel"
                name="commsPreference"
                value={formData.commsPreference}
                onChange={(event) => updateField("commsPreference", event.target.value)}
                required
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </Select>
              <SingleSelectPills
                label="Payment readiness"
                options={paymentReadinessOptions}
                value={formData.paymentReadiness}
                onChange={(value) => updateField("paymentReadiness", value)}
                required
              />
              <Select
                label="Preferred currency"
                value={formData.currencyPreference}
                onChange={(event) => updateField("currencyPreference", event.target.value)}
                required
              >
                {currencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                label="Photo/video consent"
                name="consentPhoto"
                value={formData.consentPhoto}
                onChange={(event) => updateField("consentPhoto", event.target.value)}
                required
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
              <OptionPillGroup
                label="Membership tiers"
                options={membershipTierOptions}
                selected={formData.membershipTiers}
                onToggle={(value) => toggleMultiValue("membershipTiers", value)}
                required
                hint="Choose all that apply – each tier unlocks different benefits"
              />
              {formData.membershipTiers.includes("academy") ? (
                <>
                  <OptionPillGroup
                    label="Academy focus areas"
                    options={academyFocusOptions}
                    selected={formData.academyFocusAreas}
                    onToggle={(value) => toggleMultiValue("academyFocusAreas", value)}
                    hint="Tell us what you want to prioritise"
                  />
                  <Textarea
                    label="Academy additional context"
                    rows={3}
                    placeholder="Academy goals, readiness, travel logistics"
                    value={formData.academyFocus}
                    onChange={(event) => updateField("academyFocus", event.target.value)}
                  />
                </>
              ) : null}
              <Textarea
                label="Payment notes (optional)"
                rows={2}
                placeholder="Company sponsorship, scholarships, etc."
                value={formData.paymentNotes}
                onChange={(event) => updateField("paymentNotes", event.target.value)}
              />
            </>
          )}

          {currentStep === 5 && (
            <div className="space-y-4 text-sm text-slate-700">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={formData.acceptedGuidelines}
                  onChange={(event) => updateField("acceptedGuidelines", event.target.checked)}
                />
                <span>
                  I have read and agree to the SwimBuddz <a href="/guidelines" className="text-cyan-700 underline">Community Guidelines</a>.
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={formData.acceptedPrivacy}
                  onChange={(event) => updateField("acceptedPrivacy", event.target.checked)}
                />
                <span>
                  I consent to the SwimBuddz <a href="/privacy" className="text-cyan-700 underline">Privacy Policy</a>.
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="secondary" onClick={goBack} disabled={currentStep === 0}>
            Back
          </Button>
          <Button type="button" onClick={goNext} disabled={!isStepValid() || submitting}>
            {currentStep === steps.length - 1 ? (submitting ? "Creating account..." : "Create account") : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
}


