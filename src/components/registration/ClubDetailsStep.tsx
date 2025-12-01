"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { OptionPillGroup } from "@/components/forms/OptionPillGroup";

interface ClubDetailsStepProps {
    formData: {
        emergencyContactName: string;
        emergencyContactRelationship: string;
        emergencyContactPhone: string;
        medicalInfo: string;
        locationPreference: string[];
        timeOfDayAvailability: string[];
        consentPhoto: string;
    };
    onUpdate: (field: string, value: string | string[]) => void;
    onToggleMulti: (field: string, value: string) => void;
}

const locationOptions = [
    { value: "rowe_park_yaba", label: "Rowe Park, Yaba" },
    // { value: "sunfit_ago", label: "Sunfit, Ago" },
    // { value: "federal_palace_vi", label: "Federal Palace Hotel, VI" },
];

const timeOptions = [
    { value: "early_morning", label: "Early Morning (6 AM - 9 AM)" },
    { value: "late_morning", label: "Late Morning (9 AM - 12 Noon)" },
    { value: "early_afternoon", label: "Early Afternoon (12 Noon - 3 PM)" },
    { value: "late_afternoon", label: "Late Afternoon (3 PM - 6 PM)" },
];

export function ClubDetailsStep({
    formData,
    onUpdate,
    onToggleMulti,
}: ClubDetailsStepProps) {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-900">
                    Club member details
                </h3>
                <p className="text-sm text-slate-600">
                    This information helps us keep you safe and schedule sessions effectively.
                </p>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">Emergency Contact</h4>

                <Input
                    label="Emergency Contact Name"
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={(e) => onUpdate("emergencyContactName", e.target.value)}
                    placeholder="e.g., John Doe"
                    required
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <Input
                        label="Relationship"
                        name="emergencyContactRelationship"
                        value={formData.emergencyContactRelationship}
                        onChange={(e) => onUpdate("emergencyContactRelationship", e.target.value)}
                        placeholder="e.g., Spouse, Parent, Sibling"
                        required
                    />

                    <Input
                        label="Emergency Contact Phone"
                        type="tel"
                        name="emergencyContactPhone"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => onUpdate("emergencyContactPhone", e.target.value)}
                        placeholder="+234 801 234 5678"
                        required
                    />
                </div>
            </div>

            {/* Medical Information */}
            <Textarea
                label="Medical Information"
                name="medicalInfo"
                value={formData.medicalInfo}
                onChange={(e) => onUpdate("medicalInfo", e.target.value)}
                placeholder="Any allergies, conditions, or medications we should know about..."
                rows={4}
                hint="This information is confidential and only accessible to admins for safety purposes."
            />

            {/* Training Preferences */}
            <OptionPillGroup
                label="Preferred Training Locations"
                options={locationOptions}
                selected={formData.locationPreference}
                onToggle={(value) => onToggleMulti("locationPreference", value)}
                required
                hint="Select all locations you're willing to train at"
            />

            <OptionPillGroup
                label="Availability / Time of Day"
                options={timeOptions}
                selected={formData.timeOfDayAvailability}
                onToggle={(value) => onToggleMulti("timeOfDayAvailability", value)}
                required
                hint="When are you typically available?"
            />

            {/* Media Consent */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                    Photo & Video Consent <span className="text-rose-500">*</span>
                </label>
                <p className="text-sm text-slate-600">
                    Can we feature you in photos/videos for social media and promotional materials?
                </p>
                <div className="flex gap-4">
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
        </div>
    );
}
