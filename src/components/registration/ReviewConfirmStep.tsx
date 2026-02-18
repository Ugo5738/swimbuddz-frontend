"use client";

import { WHATSAPP_GROUP_URL } from "@/lib/config";
import { CheckCircle, ExternalLink } from "lucide-react";

interface ReviewConfirmStepProps {
  formData: {
    // Tier
    membershipTier: string | null;
    // Core Profile
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    swimLevel: string;
    gender?: string;
    dateOfBirth?: string;
    profilePhotoUrl?: string;
    // Club Details (if applicable)
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
    locationPreference?: string[];
    timeOfDayAvailability?: string[];
    medicalInfo?: string;
    clubNotes?: string;
    consentPhoto?: string;
    commsPreference?: string;
    paymentReadiness?: string;
    currencyPreference?: string;
    paymentNotes?: string;
    languagePreference?: string;
    discoverySource?: string;
    socialInstagram?: string;
    socialLinkedIn?: string;
    socialOther?: string;
    // Academy Details (if applicable)
    academyGoals?: string;
    academyLessonPreference?: string;
    academyPreferredCoachGender?: string;
    academyProgram?: string;
    academyLevel?: string;
    academyGoal?: string;
    academySchedule?: string;
    academyNotes?: string;
    academySkillAssessment?: {
      canFloat: boolean;
      headUnderwater: boolean;
      deepWaterComfort: boolean;
      canSwim25m: boolean;
    };
    // Volunteer
    volunteerInterest?: string[];
    showInDirectory: boolean;
    interestTags?: string[];
    occupation?: string;
    previousCommunities?: string;
    hopesFromSwimbuddz?: string;
  };
  acceptedTerms: boolean;
  onAcceptTerms: (accepted: boolean) => void;
}

export function ReviewConfirmStep({
  formData,
  acceptedTerms,
  onAcceptTerms,
}: ReviewConfirmStepProps) {
  const humanize = (value?: string) =>
    value
      ? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";

  const formatList = (values?: string[]) =>
    values && values.length > 0
      ? values.map(humanize).join(", ")
      : "None selected";

  const formatAssessment = (label: string, value?: boolean) =>
    `${label}: ${value ? "Yes" : "No"}`;

  const tierLabel =
    formData.membershipTier === "community"
      ? "Community"
      : formData.membershipTier === "club"
        ? "Club"
        : "Academy";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Review & confirm
        </h3>
        <p className="text-sm text-slate-600">
          Please review your information before submitting your registration.
        </p>
      </div>

      {/* Summary Sections */}
      <div className="space-y-4">
        {/* Tier */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">
            Membership Tier
          </h4>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-cyan-600" />
            <span className="font-medium text-slate-900">{tierLabel}</span>
          </div>
        </div>

        {/* Personal Info */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">
            Personal Information
          </h4>
          <dl className="grid gap-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Name:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {formData.firstName} {formData.lastName}
              </dd>
            </div>
            {formData.gender ? (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Gender:</dt>
                <dd className="col-span-2 font-medium text-slate-900 capitalize">
                  {formData.gender}
                </dd>
              </div>
            ) : null}
            {formData.dateOfBirth ? (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Date of Birth:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formData.dateOfBirth}
                </dd>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Email:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {formData.email}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Phone:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {formData.phone}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Location:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {formData.city}, {formData.country}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Swim Level:</dt>
              <dd className="col-span-2 font-medium text-slate-900 capitalize">
                {formData.swimLevel}
              </dd>
            </div>
            {formData.discoverySource ? (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Discovery:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {humanize(formData.discoverySource)}
                </dd>
              </div>
            ) : null}
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Language:</dt>
              <dd className="col-span-2 font-medium text-slate-900 capitalize">
                {humanize(formData.languagePreference || "english")}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Comms:</dt>
              <dd className="col-span-2 font-medium text-slate-900 capitalize">
                {humanize(formData.commsPreference || "whatsapp")}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Currency:</dt>
              <dd className="col-span-2 font-medium text-slate-900 uppercase">
                {formData.currencyPreference || "NGN"}
              </dd>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Payment readiness:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {humanize(formData.paymentReadiness || "--")}
              </dd>
            </div>
            {formData.occupation && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Occupation:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formData.occupation}
                </dd>
              </div>
            )}
            {formData.previousCommunities && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Prev. Communities:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formData.previousCommunities}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Club Details */}
        {(formData.membershipTier === "club" ||
          formData.membershipTier === "academy") && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Club Details
            </h4>
            <dl className="grid gap-3 text-sm">
              {formData.emergencyContactName && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Emergency Contact:</dt>
                  <dd className="col-span-2 font-medium text-slate-900 space-y-1">
                    <div>{formData.emergencyContactName}</div>
                    {formData.emergencyContactRelationship ? (
                      <div className="text-slate-700">
                        {formData.emergencyContactRelationship}
                      </div>
                    ) : null}
                    {formData.emergencyContactPhone ? (
                      <div className="text-slate-700">
                        {formData.emergencyContactPhone}
                      </div>
                    ) : null}
                  </dd>
                </div>
              )}
              {formData.medicalInfo && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Medical Info:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {formData.medicalInfo}
                  </dd>
                </div>
              )}
              {formData.locationPreference &&
                formData.locationPreference.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-slate-600">Locations:</dt>
                    <dd className="col-span-2 font-medium text-slate-900">
                      {formatList(formData.locationPreference)}
                    </dd>
                  </div>
                )}
              {formData.timeOfDayAvailability &&
                formData.timeOfDayAvailability.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    <dt className="text-slate-600">Time of day:</dt>
                    <dd className="col-span-2 font-medium text-slate-900">
                      {formatList(formData.timeOfDayAvailability)}
                    </dd>
                  </div>
                )}
              {formData.clubNotes && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Notes:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {formData.clubNotes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Academy Details */}
        {formData.membershipTier === "academy" && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-900">
              Academy Details
            </h4>
            <dl className="grid gap-3 text-sm">
              {formData.academyLessonPreference && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Lesson Preference:</dt>
                  <dd className="col-span-2 font-medium text-slate-900 capitalize">
                    {humanize(formData.academyLessonPreference)}
                  </dd>
                </div>
              )}
              {formData.academyGoals && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Goals:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {formData.academyGoals.substring(0, 100)}
                    {formData.academyGoals.length > 100 ? "..." : ""}
                  </dd>
                </div>
              )}
              {formData.academyPreferredCoachGender && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Coach Preference:</dt>
                  <dd className="col-span-2 font-medium text-slate-900 capitalize">
                    {humanize(formData.academyPreferredCoachGender)}
                  </dd>
                </div>
              )}
              {formData.academyProgram && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Program:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {humanize(formData.academyProgram)}
                  </dd>
                </div>
              )}
              {formData.academyLevel && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Level:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {humanize(formData.academyLevel)}
                  </dd>
                </div>
              )}
              {formData.academyGoal && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Primary Goal:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {humanize(formData.academyGoal)}
                  </dd>
                </div>
              )}
              {formData.academySchedule && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Schedule:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {humanize(formData.academySchedule)}
                  </dd>
                </div>
              )}
              {formData.academySkillAssessment ? (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Skills:</dt>
                  <dd className="col-span-2 space-y-1 font-medium text-slate-900">
                    <div>
                      {formatAssessment(
                        "Can float",
                        formData.academySkillAssessment.canFloat,
                      )}
                    </div>
                    <div>
                      {formatAssessment(
                        "Head underwater",
                        formData.academySkillAssessment.headUnderwater,
                      )}
                    </div>
                    <div>
                      {formatAssessment(
                        "Deep water comfort",
                        formData.academySkillAssessment.deepWaterComfort,
                      )}
                    </div>
                    <div>
                      {formatAssessment(
                        "Can swim 25m",
                        formData.academySkillAssessment.canSwim25m,
                      )}
                    </div>
                  </dd>
                </div>
              ) : null}
              {formData.academyNotes && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Notes:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {formData.academyNotes}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Community Engagement */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">
            Community Engagement
          </h4>
          <dl className="grid gap-3 text-sm">
            {formData.volunteerInterest &&
              formData.volunteerInterest.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-slate-600">Volunteer Interests:</dt>
                  <dd className="col-span-2 font-medium text-slate-900">
                    {formatList(formData.volunteerInterest)}
                  </dd>
                </div>
              )}
            {formData.interestTags && formData.interestTags.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Interests:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formatList(formData.interestTags)}
                </dd>
              </div>
            )}
            {(formData.socialInstagram ||
              formData.socialLinkedIn ||
              formData.socialOther) && (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Social:</dt>
                <dd className="col-span-2 font-medium text-slate-900 space-y-1">
                  {formData.socialInstagram ? (
                    <div>Instagram: {formData.socialInstagram}</div>
                  ) : null}
                  {formData.socialLinkedIn ? (
                    <div>LinkedIn: {formData.socialLinkedIn}</div>
                  ) : null}
                  {formData.socialOther ? (
                    <div>Other: {formData.socialOther}</div>
                  ) : null}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <dt className="text-slate-600">Member Directory:</dt>
              <dd className="col-span-2 font-medium text-slate-900">
                {formData.showInDirectory ? "Visible" : "Private"}
              </dd>
            </div>
            {formData.paymentNotes ? (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Payment notes:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formData.paymentNotes}
                </dd>
              </div>
            ) : null}
            {formData.hopesFromSwimbuddz ? (
              <div className="grid grid-cols-3 gap-2">
                <dt className="text-slate-600">Hopes from SwimBuddz:</dt>
                <dd className="col-span-2 font-medium text-slate-900">
                  {formData.hopesFromSwimbuddz}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {/* WhatsApp Group */}
      <div className="rounded-lg border-2 border-cyan-200 bg-cyan-50 p-4">
        <h4 className="mb-2 font-semibold text-cyan-900">Join Our Community</h4>
        <p className="mb-3 text-sm text-cyan-800">
          Connect with fellow swimmers, get updates, and stay engaged with the
          SwimBuddz community!
        </p>
        <a
          href={WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Join WhatsApp Group
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="font-medium text-slate-900">Terms & Conditions</h4>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => onAcceptTerms(e.target.checked)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            required
          />
          <div>
            <span className="text-sm text-slate-900">
              I have read and agree to the{" "}
              <a
                href="/guidelines-and-rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-600 underline hover:text-cyan-700"
              >
                Guidelines and Rules
              </a>{" "}
              and{" "}
              <a
                href="/privacy"
                target="_blank"
                className="text-cyan-600 hover:text-cyan-700 hover:underline"
              >
                Privacy Policy
              </a>
              <span className="text-rose-500"> *</span>
            </span>
            <p className="mt-1 text-xs text-slate-600">
              By registering, you acknowledge that you've read and understood
              our community guidelines, safety protocols, and data handling
              practices.
            </p>
          </div>
        </label>
      </div>

      <div className="rounded-lg bg-emerald-50 p-4">
        <p className="text-sm text-emerald-900">
          <strong>What happens next?</strong> After submitting, you'll receive a
          confirmation email. Activate Community to unlock member features, then
          complete readiness and pay when you're ready to activate Club or join
          an Academy cohort.
        </p>
      </div>
    </div>
  );
}
