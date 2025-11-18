"use client";

import { useState } from "react";
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
import { registerMember } from "@/lib/registration";
import { TimezoneCombobox } from "@/components/forms/TimezoneCombobox";

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

const strokesOptions = [
  { value: "freestyle", label: "Freestyle" },
  { value: "backstroke", label: "Backstroke" },
  { value: "breaststroke", label: "Breaststroke" },
  { value: "butterfly", label: "Butterfly" },
  { value: "im", label: "Individual medley" },
  { value: "open_water", label: "Open water" },
  { value: "other", label: "Other" }
];

const interestOptions = [
  { value: "fitness", label: "Fitness & wellness" },
  { value: "triathlon", label: "Triathlon / multi-sport" },
  { value: "remote_coaching", label: "Remote coaching" },
  { value: "academy_track", label: "Academy track" },
  { value: "open_water", label: "Open water" },
  { value: "volunteering", label: "Volunteering" }
];

const certificationOptions = [
  { value: "coach", label: "Coach" },
  { value: "lifeguard", label: "Lifeguard" },
  { value: "cpr", label: "CPR" },
  { value: "first_aid", label: "First aid" }
];

const travelFlexibilityOptions = [
  { value: "local_only", label: "Local sessions only" },
  { value: "regional", label: "Regional travel is OK" },
  { value: "global", label: "Global / relocation ready" }
];

const membershipTierOptions = [
  { value: "community", label: "Community" },
  { value: "club", label: "Club" },
  { value: "academy", label: "Academy" }
];

const paymentReadinessOptions = [
  { value: "ready_now", label: "Ready to pay now" },
  { value: "need_notice", label: "Need advance notice" },
  { value: "sponsor_support", label: "Looking for sponsor support" }
];

const discoverySourceOptions = [
  { value: "friend", label: "Friend / referral" },
  { value: "instagram", label: "Instagram" },
  { value: "event", label: "Event or meet-up" },
  { value: "search", label: "Search" },
  { value: "other", label: "Other" }
];

const countryOptions = Array.from(new Set(phoneCodes.map((country) => country.name))).sort();

const currencyOptions = [
  { value: "NGN", label: "NGN" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "EUR", label: "EUR" }
];

type FormState = {
  fullName: string;
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
  availability: string;
  timeOfDayAvailability: string;
  locationPreference: string;
  travelFlexibility: string;
  facilityAccess: string;
  equipmentNeeds: string;
  travelNotes: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhoneCountryCode: string;
  emergencyContactPhone: string;
  emergencyContactRegion: string;
  medicalInfo: string;
  safetyNotes: string;
  volunteerInterest: string;
  volunteerRoles: string;
  discoverySource: string;
  socialHandles: string;
  languagePreference: string;
  commsPreference: string;
  paymentReadiness: string;
  currencyPreference: string;
  consentPhoto: string;
  membershipTiers: string[];
  academyFocus: string;
  paymentNotes: string;
  acceptedGuidelines: boolean;
  acceptedPrivacy: boolean;
};

const initialFormState: FormState = {
  fullName: "",
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
  availability: "",
  timeOfDayAvailability: "",
  locationPreference: "",
  travelFlexibility: "",
  facilityAccess: "",
  equipmentNeeds: "",
  travelNotes: "",
  emergencyContactName: "",
  emergencyContactRelationship: "",
  emergencyContactPhoneCountryCode: "+234",
  emergencyContactPhone: "",
  emergencyContactRegion: "",
  medicalInfo: "",
  safetyNotes: "",
  volunteerInterest: "",
  volunteerRoles: "",
  discoverySource: "",
  socialHandles: "",
  languagePreference: "English",
  commsPreference: "sms",
  paymentReadiness: "",
  currencyPreference: "NGN",
  consentPhoto: "no",
  membershipTiers: [],
  academyFocus: "",
  paymentNotes: "",
  acceptedGuidelines: false,
  acceptedPrivacy: false
};

type MultiValueField = "strokes" | "interests" | "certifications" | "membershipTiers";

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
          formData.fullName &&
            formData.email &&
            formData.password &&
            formData.phone &&
            formData.city &&
            formData.country &&
            formData.timeZone
        );
      case 1:
        return (
          Boolean(formData.swimLevel && formData.deepWaterComfort && formData.goalsNarrative) &&
          formData.strokes.length > 0 &&
          (formData.interests.length > 0 || Boolean(formData.goalsOther.trim()))
        );
      case 2:
        return Boolean(
          formData.availability &&
            formData.timeOfDayAvailability &&
            formData.locationPreference &&
            formData.travelFlexibility
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
            formData.volunteerInterest &&
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
      await registerMember(
        {
          fullName: formData.fullName,
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
          availability: formData.availability,
          timeOfDayAvailability: formData.timeOfDayAvailability,
          locationPreference: formData.locationPreference,
          travelFlexibility: formData.travelFlexibility,
          facilityAccess: formData.facilityAccess,
          equipmentNeeds: formData.equipmentNeeds,
          travelNotes: formData.travelNotes,
          emergencyContactName: formData.emergencyContactName,
          emergencyContactRelationship: formData.emergencyContactRelationship,
          emergencyContactPhone: `${formData.emergencyContactPhoneCountryCode} ${formData.emergencyContactPhone}`.trim(),
          emergencyContactRegion: formData.emergencyContactRegion,
          medicalInfo: formData.medicalInfo,
          safetyNotes: formData.safetyNotes,
          volunteerInterest: formData.volunteerInterest,
          volunteerRoles: formData.volunteerRoles,
          discoverySource: formData.discoverySource,
          socialHandles: formData.socialHandles,
          languagePreference: formData.languagePreference,
          commsPreference: formData.commsPreference,
          paymentReadiness: formData.paymentReadiness,
          currencyPreference: formData.currencyPreference,
          consentPhoto: formData.consentPhoto,
          membershipTiers: formData.membershipTiers,
          academyFocus: formData.academyFocus,
          paymentNotes: formData.paymentNotes
        },
        formData.password
      );
      router.push("/member/profile");
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
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold",
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
              <Input
                label="Full name"
                name="fullName"
                placeholder="Ada Obi"
                value={formData.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                required
              />
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
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
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
                label="Narrative goals"
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
                <Textarea
                  label="Coaching background"
                  rows={3}
                  placeholder="Share credentials, clubs, or focus areas"
                  value={formData.coachingExperience}
                  onChange={(event) => updateField("coachingExperience", event.target.value)}
                />
              ) : null}
            </>
          )}

          {currentStep === 2 && (
            <>
              <Textarea
                label="Weekly availability"
                name="availability"
                rows={3}
                placeholder="Weekday evenings, Saturday mornings, remote sessions"
                value={formData.availability}
                onChange={(event) => updateField("availability", event.target.value)}
                required
              />
              <Input
                label="Time-of-day availability"
                name="timeOfDayAvailability"
                placeholder="Early mornings, lunch breaks, nights"
                value={formData.timeOfDayAvailability}
                onChange={(event) => updateField("timeOfDayAvailability", event.target.value)}
                required
              />
              <Textarea
                label="Preferred locations"
                name="locationPreference"
                rows={2}
                placeholder="Yaba, Ikoyi, Accra, remote, etc."
                value={formData.locationPreference}
                onChange={(event) => updateField("locationPreference", event.target.value)}
                required
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
              <Textarea
                label="Facility / water access"
                rows={2}
                placeholder="City pools, open water, home pool"
                value={formData.facilityAccess}
                onChange={(event) => updateField("facilityAccess", event.target.value)}
              />
              <Textarea
                label="Equipment needs"
                rows={2}
                placeholder="Fins, paddles, snorkel, warm-up gear"
                value={formData.equipmentNeeds}
                onChange={(event) => updateField("equipmentNeeds", event.target.value)}
              />
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
              <Input
                label="Social handles (optional)"
                placeholder="@swimbuddz on IG, LinkedIn"
                value={formData.socialHandles}
                onChange={(event) => updateField("socialHandles", event.target.value)}
              />
              <Textarea
                label="Volunteer interest / community roles"
                rows={3}
                placeholder="Ride share lead, mentor, host sessions"
                value={formData.volunteerInterest}
                onChange={(event) => updateField("volunteerInterest", event.target.value)}
                required
              />
              <Textarea
                label="Specific roles you can support (optional)"
                rows={2}
                value={formData.volunteerRoles}
                onChange={(event) => updateField("volunteerRoles", event.target.value)}
              />
              <Input
                label="Language preference"
                placeholder="English, French, Yoruba"
                value={formData.languagePreference}
                onChange={(event) => updateField("languagePreference", event.target.value)}
                required
              />
              <Select
                label="Preferred communication channel"
                name="commsPreference"
                value={formData.commsPreference}
                onChange={(event) => updateField("commsPreference", event.target.value)}
                required
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </Select>
              <Select
                label="Payment readiness"
                value={formData.paymentReadiness}
                onChange={(event) => updateField("paymentReadiness", event.target.value)}
                required
              >
                <option value="">Select readiness</option>
                {paymentReadinessOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
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
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
              <OptionPillGroup
                label="Membership tiers"
                options={membershipTierOptions}
                selected={formData.membershipTiers}
                onToggle={(value) => toggleMultiValue("membershipTiers", value)}
                required
                hint="Choose all that apply"
              />
              {formData.membershipTiers.includes("academy") ? (
                <Textarea
                  label="Academy focus"
                  rows={3}
                  placeholder="Academy goals, readiness, travel logistics"
                  value={formData.academyFocus}
                  onChange={(event) => updateField("academyFocus", event.target.value)}
                />
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

type OptionPillGroupProps = {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  hint?: string;
  required?: boolean;
};

function OptionPillGroup({ label, options, selected, onToggle, hint, required }: OptionPillGroupProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-rose-500">
            *
          </span>
        ) : null}
      </legend>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={clsx(
                "inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium",
                active
                  ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                  : "border-slate-300 text-slate-600 hover:border-slate-400"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={active}
                onChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
