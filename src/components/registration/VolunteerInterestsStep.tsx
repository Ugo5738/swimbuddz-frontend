"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SingleSelectPills } from "@/components/forms/SingleSelectPills";
import { Textarea } from "@/components/ui/Textarea";
import {
    paymentReadinessOptions,
    currencyOptions,
    languageOptions,
    discoverySourceOptions
} from "@/lib/options";

interface VolunteerInterestsStepProps {
    formData: {
        volunteerInterest: string[];
        interestTags: string[];
        showInDirectory: boolean;
        socialInstagram: string;
        socialLinkedIn: string;
        socialOther: string;
        languagePreference: string;
        commsPreference: string;
        paymentReadiness: string;
        currencyPreference: string;
        paymentNotes: string;
        consentPhoto: string;
    };
    onToggleMulti: (field: string, value: string) => void;
    onUpdate: (field: string, value: any) => void;
}

const volunteerRoleOptions = [
    { value: "media", label: "Media & Photography" },
    { value: "logistics", label: "Logistics Support" },
    { value: "coaching_support", label: "Coaching Assistant" },
    { value: "lane_marshal", label: "Lane Marshal" },
    { value: "admin", label: "Administrative Support" },
    { value: "event_planning", label: "Event Planning" },
];

const interestTagOptions = [
    { value: "ocean_swimming", label: "Ocean Swimming" },
    { value: "fitness", label: "Fitness & Health" },
    { value: "triathlon", label: "Triathlon Training" },
    { value: "social", label: "Social Events" },
    { value: "competitive", label: "Competitive Swimming" },
    { value: "technique", label: "Technique Improvement" },
    { value: "safety", label: "Water Safety" },
];

export function VolunteerInterestsStep({
    formData,
    onToggleMulti,
    onUpdate,
}: VolunteerInterestsStepProps) {
    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Community & Preferences
                </h3>
                <p className="text-sm text-slate-600">
                    Tell us a bit more about yourself to help us personalize your experience.
                </p>
            </div>

            {/* Social Media */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">Social Connections (Optional)</h4>
                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Instagram Handle"
                        value={formData.socialInstagram}
                        onChange={(e) => onUpdate("socialInstagram", e.target.value)}
                        placeholder="@username"
                    />
                    <Input
                        label="LinkedIn Profile"
                        value={formData.socialLinkedIn}
                        onChange={(e) => onUpdate("socialLinkedIn", e.target.value)}
                        placeholder="https://linkedin.com/in/..."
                    />
                    <div className="md:col-span-2">
                        <Input
                            label="Other Social Link"
                            value={formData.socialOther}
                            onChange={(e) => onUpdate("socialOther", e.target.value)}
                            placeholder="Website, Blog, etc."
                        />
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div className="grid gap-6 md:grid-cols-2">
                <Select
                    label="Language Preference"
                    value={formData.languagePreference}
                    onChange={(e) => onUpdate("languagePreference", e.target.value)}
                >
                    {languageOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </Select>

                <Select
                    label="Communication Preference"
                    value={formData.commsPreference}
                    onChange={(e) => onUpdate("commsPreference", e.target.value)}
                >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                </Select>
            </div>

            {/* Payment Preferences */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">Payment Preferences</h4>
                <div className="space-y-4">
                    <SingleSelectPills
                        label="Payment Readiness"
                        options={paymentReadinessOptions}
                        value={formData.paymentReadiness}
                        onChange={(value) => onUpdate("paymentReadiness", value)}
                    />

                    <Select
                        label="Preferred Currency"
                        value={formData.currencyPreference}
                        onChange={(e) => onUpdate("currencyPreference", e.target.value)}
                    >
                        {currencyOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Select>

                    <Textarea
                        label="Payment Notes"
                        value={formData.paymentNotes}
                        onChange={(e) => onUpdate("paymentNotes", e.target.value)}
                        placeholder="Any specific billing requirements..."
                        rows={2}
                    />
                </div>
            </div>

            {/* Volunteer Interests */}
            <OptionPillGroup
                label="Volunteer Interests (Optional)"
                options={volunteerRoleOptions}
                selected={formData.volunteerInterest}
                onToggle={(value) => onToggleMulti("volunteerInterest", value)}
                hint="Select any volunteer roles you'd be interested in helping with"
            />

            {formData.volunteerInterest.length > 0 && (
                <div className="rounded-lg bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-900">
                        <strong>Thank you for your interest in volunteering!</strong> We'll reach out when
                        opportunities matching your interests become available.
                    </p>
                </div>
            )}

            {/* Interest Tags */}
            <OptionPillGroup
                label="Swimming Interests (Optional)"
                options={interestTagOptions}
                selected={formData.interestTags}
                onToggle={(value) => onToggleMulti("interestTags", value)}
                hint="Help us connect you with like-minded swimmers"
            />

            {/* Media Consent */}
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <label className="block text-sm font-medium text-slate-900">
                    Photo & Video Consent <span className="text-rose-500">*</span>
                </label>
                <p className="text-sm text-slate-600">
                    Can we feature you in photos/videos for social media and promotional materials?
                </p>
                <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="consentPhoto"
                            value="yes"
                            checked={formData.consentPhoto === "yes"}
                            onChange={(e) => onUpdate("consentPhoto", e.target.value)}
                            className="h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-slate-700">Yes, I consent</span>
                    </label>
                    <label className="flex items-center gap-2">
                        <input
                            type="radio"
                            name="consentPhoto"
                            value="no"
                            checked={formData.consentPhoto === "no"}
                            onChange={(e) => onUpdate("consentPhoto", e.target.value)}
                            className="h-4 w-4 border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-sm text-slate-700">No, please don't feature me</span>
                    </label>
                </div>
            </div>

            {/* Member Directory Opt-in */}
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">Member Directory</h4>
                <p className="text-sm text-slate-600">
                    Would you like to appear in the member directory? This helps other members connect
                    with you based on shared interests and swimming goals.
                </p>

                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={formData.showInDirectory}
                        onChange={(e) => onUpdate("showInDirectory", e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                        <span className="text-sm font-medium text-slate-900">
                            Yes, show my profile in the member directory
                        </span>
                        <p className="mt-1 text-xs text-slate-500">
                            Only your name, city, swim level, and selected interests will be visible to other members.
                        </p>
                    </div>
                </label>
            </div>
        </div>
    );
}
