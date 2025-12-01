"use client";

import { CheckCircle, ExternalLink } from "lucide-react";
import { WHATSAPP_GROUP_URL } from "@/lib/config";

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
        // Club Details (if applicable)
        emergencyContactName?: string;
        locationPreference?: string[];
        timeOfDayAvailability?: string[];
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
        // Volunteer
        volunteerInterest?: string[];
        showInDirectory: boolean;
        interestTags?: string[];
    };
    acceptedTerms: boolean;
    onAcceptTerms: (accepted: boolean) => void;
}

export function ReviewConfirmStep({
    formData,
    acceptedTerms,
    onAcceptTerms,
}: ReviewConfirmStepProps) {
    const tierLabel = formData.membershipTier === "community"
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
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Membership Tier</h4>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-cyan-600" />
                        <span className="font-medium text-slate-900">{tierLabel}</span>
                    </div>
                </div>

                {/* Personal Info */}
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Personal Information</h4>
                    <dl className="grid gap-3 text-sm">
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Name:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">
                                {formData.firstName} {formData.lastName}
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Email:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">{formData.email}</dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Phone:</dt>
                            <dd className="col-span-2 font-medium text-slate-900">{formData.phone}</dd>
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
                                    {formData.discoverySource}
                                </dd>
                            </div>
                        ) : null}
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Language:</dt>
                            <dd className="col-span-2 font-medium text-slate-900 capitalize">
                                {formData.languagePreference || "english"}
                            </dd>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <dt className="text-slate-600">Comms:</dt>
                            <dd className="col-span-2 font-medium text-slate-900 capitalize">
                                {formData.commsPreference || "whatsapp"}
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
                                {formData.paymentReadiness || "--"}
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Club Details */}
                {(formData.membershipTier === "club" || formData.membershipTier === "academy") && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">Club Details</h4>
                        <dl className="grid gap-3 text-sm">
                            {formData.emergencyContactName && (
                                <div className="grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600">Emergency Contact:</dt>
                                    <dd className="col-span-2 font-medium text-slate-900">
                                        {formData.emergencyContactName}
                                    </dd>
                                </div>
                            )}
                            {formData.locationPreference && formData.locationPreference.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600">Locations:</dt>
                                    <dd className="col-span-2 font-medium text-slate-900">
                                        {formData.locationPreference.length} selected
                                    </dd>
                                </div>
                            )}
                            {formData.timeOfDayAvailability && formData.timeOfDayAvailability.length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600">Time of day:</dt>
                                    <dd className="col-span-2 font-medium text-slate-900">
                                        {formData.timeOfDayAvailability.length} selected
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </div>
                )}

                {/* Academy Details */}
                {formData.membershipTier === "academy" && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-semibold text-slate-900">Academy Details</h4>
                        <dl className="grid gap-3 text-sm">
                            {formData.academyLessonPreference && (
                                <div className="grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600">Lesson Preference:</dt>
                                    <dd className="col-span-2 font-medium text-slate-900 capitalize">
                                        {formData.academyLessonPreference.replace("_", " ")}
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
                        </dl>
                    </div>
                )}

                {/* Community Engagement */}
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h4 className="mb-3 text-sm font-semibold text-slate-900">Community Engagement</h4>
                    <dl className="grid gap-3 text-sm">
                        {formData.volunteerInterest && formData.volunteerInterest.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                <dt className="text-slate-600">Volunteer Interests:</dt>
                                <dd className="col-span-2 font-medium text-slate-900">
                                    {formData.volunteerInterest.length} role(s)
                                </dd>
                            </div>
                        )}
                        {formData.interestTags && formData.interestTags.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                <dt className="text-slate-600">Interests:</dt>
                                <dd className="col-span-2 font-medium text-slate-900">
                                    {formData.interestTags.length} selected
                                </dd>
                            </div>
                        )}
                        {(formData.socialInstagram || formData.socialLinkedIn || formData.socialOther) && (
                            <div className="grid grid-cols-3 gap-2">
                                <dt className="text-slate-600">Social:</dt>
                                <dd className="col-span-2 font-medium text-slate-900 space-y-1">
                                    {formData.socialInstagram ? <div>Instagram: {formData.socialInstagram}</div> : null}
                                    {formData.socialLinkedIn ? <div>LinkedIn: {formData.socialLinkedIn}</div> : null}
                                    {formData.socialOther ? <div>Other: {formData.socialOther}</div> : null}
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
                                <dd className="col-span-2 font-medium text-slate-900">{formData.paymentNotes}</dd>
                            </div>
                        ) : null}
                    </dl>
                </div>
            </div>

            {/* WhatsApp Group */}
            <div className="rounded-lg border-2 border-cyan-200 bg-cyan-50 p-4">
                <h4 className="mb-2 font-semibold text-cyan-900">Join Our Community</h4>
                <p className="mb-3 text-sm text-cyan-800">
                    Connect with fellow swimmers, get updates, and stay engaged with the SwimBuddz community!
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
                            By registering, you acknowledge that you've read and understood our community
                            guidelines, safety protocols, and data handling practices.
                        </p>
                    </div>
                </label>
            </div>

            <div className="rounded-lg bg-emerald-50 p-4">
                <p className="text-sm text-emerald-900">
                    <strong>What happens next?</strong> After submitting, you'll receive a confirmation email.
                    Club and Academy members will be contacted within 48 hours with next steps and payment information.
                </p>
            </div>
        </div>
    );
}
