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

const steps = [
  { title: "Basic info", description: "Let’s capture the essentials so coaches know who’s swimming." },
  { title: "Experience & goals", description: "Help us place you in the right lane and recommend coaches." },
  { title: "Logistics", description: "Availability and preferred locations keep scheduling easy." },
  { title: "Safety", description: "Emergency contacts and medical notes stay confidential." },
  { title: "Community & consents", description: "Set how you’d like to engage with the community." },
  { title: "Agreements", description: "Confirm that you’ve read the rules and privacy commitments." }
];

const initialFormState = {
  fullName: "",
  email: "",
  phoneCountryCode: "+234",
  phone: "",
  password: "",
  swimLevel: "",
  goals: "",
  availability: "",
  locationPreference: "",
  emergencyContact: "",
  medicalInfo: "",
  volunteerInterest: "",
  commsPreference: "sms",
  consentPhoto: "no",
  acceptedGuidelines: false,
  acceptedPrivacy: false
};

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<T extends keyof typeof initialFormState>(field: T, value: (typeof initialFormState)[T]) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function formatPhoneInput(value: string) {
    const digitsOnly = value.replace(/[^\d]/g, "");
    return digitsOnly.replace(/^0+/, "");
  }

  async function handleSubmit() {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await registerMember(
        {
          fullName: formData.fullName,
          email: formData.email,
          phone: `${formData.phoneCountryCode} ${formData.phone}`,
          swimLevel: formData.swimLevel,
          goals: formData.goals,
          availability: formData.availability,
          locationPreference: formData.locationPreference,
          emergencyContact: formData.emergencyContact,
          medicalInfo: formData.medicalInfo,
          volunteerInterest: formData.volunteerInterest,
          commsPreference: formData.commsPreference,
          consentPhoto: formData.consentPhoto
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

  function isStepValid() {
    switch (currentStep) {
      case 0:
        return Boolean(formData.fullName && formData.email && formData.phone && formData.password);
      case 1:
        return Boolean(formData.swimLevel && formData.goals);
      case 2:
        return Boolean(formData.availability && formData.locationPreference);
      case 3:
        return Boolean(formData.emergencyContact);
      case 4:
        return Boolean(formData.volunteerInterest && formData.commsPreference);
      case 5:
        return formData.acceptedGuidelines && formData.acceptedPrivacy;
      default:
        return true;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Join SwimBuddz</p>
        <h1 className="text-4xl font-bold text-slate-900">Registration</h1>
        <p className="text-base text-slate-600">Follow the simple six-step flow to become an official SwimBuddz member.</p>
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
              <Textarea
                label="Goals and focus areas"
                name="goals"
                rows={4}
                placeholder="e.g. Improve breathing, prep for triathlon, master deep water"
                value={formData.goals}
                onChange={(event) => updateField("goals", event.target.value)}
                required
              />
            </>
          )}

          {currentStep === 2 && (
            <>
              <Textarea
                label="Availability"
                name="availability"
                rows={3}
                placeholder="Weekday evenings, Saturday mornings, travel schedule"
                value={formData.availability}
                onChange={(event) => updateField("availability", event.target.value)}
                required
              />
              <Input
                label="Preferred locations"
                name="locationPreference"
                placeholder="Yaba, Ikoyi, Landmark"
                value={formData.locationPreference}
                onChange={(event) => updateField("locationPreference", event.target.value)}
                required
              />
            </>
          )}

          {currentStep === 3 && (
            <>
              <Textarea
                label="Emergency contact"
                name="emergencyContact"
                rows={3}
                placeholder="Name, relationship, phone number"
                value={formData.emergencyContact}
                onChange={(event) => updateField("emergencyContact", event.target.value)}
                required
              />
              <Textarea
                label="Medical info (optional)"
                name="medicalInfo"
                rows={3}
                placeholder="Asthma, allergies, injuries, medications"
                value={formData.medicalInfo}
                onChange={(event) => updateField("medicalInfo", event.target.value)}
              />
            </>
          )}

          {currentStep === 4 && (
            <>
              <Textarea
                label="Volunteer interest / community roles"
                name="volunteerInterest"
                rows={3}
                placeholder="e.g. Ride share lead, trip planner, media support"
                value={formData.volunteerInterest}
                onChange={(event) => updateField("volunteerInterest", event.target.value)}
                required
              />
              <Select
                label="Preferred communication channel"
                name="commsPreference"
                value={formData.commsPreference}
                onChange={(event) => updateField("commsPreference", event.target.value)}
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </Select>
              <Select
                label="Photo/video consent"
                name="consentPhoto"
                value={formData.consentPhoto}
                onChange={(event) => updateField("consentPhoto", event.target.value)}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </Select>
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
