"use client";

import { ClubReadinessStep } from "@/components/onboarding/ClubReadinessStep";
import { Button } from "@/components/ui/Button";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { useUpgrade } from "@/lib/upgradeContext";
import { Calendar, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Member = {
    id?: string;
    availability?: {
        available_days?: string[] | null;
    } | null;
    membership?: {
        club_notes?: string | null;
    } | null;
};

export default function ClubReadinessPage() {
    const router = useRouter();
    const { state, setClubReadinessData, markClubReadinessComplete, setTargetTier } = useUpgrade();

    const [formData, setFormData] = useState({
        availabilitySlots: state.clubReadinessData?.availableDays || [],
        clubNotes: state.clubReadinessData?.clubNotes || "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Set target tier on mount
    useEffect(() => {
        setTargetTier("club");
    }, [setTargetTier]);

    // Load existing data from member profile
    const loadMember = useCallback(async () => {
        setLoading(true);
        try {
            const member = await apiGet<Member>("/api/v1/members/me", { auth: true });
            setFormData({
                availabilitySlots: member.availability?.available_days || [],
                clubNotes: member.membership?.club_notes || "",
            });
        } catch (e) {
            console.error("Failed to load member data:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadMember();
    }, [loadMember]);

    const handleToggleAvailability = (value: string) => {
        setFormData((prev) => ({
            ...prev,
            availabilitySlots: prev.availabilitySlots.includes(value)
                ? prev.availabilitySlots.filter((v) => v !== value)
                : [...prev.availabilitySlots, value],
        }));
    };

    const handleUpdateNotes = (value: string) => {
        setFormData((prev) => ({ ...prev, clubNotes: value }));
    };

    const isValid = formData.availabilitySlots.length > 0;

    const handleSubmit = async () => {
        if (!isValid) return;

        setSaving(true);
        try {
            // Save to backend - include 'club' in requested_tiers so entitlement can be applied after payment
            await apiPatch(
                "/api/v1/members/me",
                {
                    availability: { available_days: formData.availabilitySlots },
                    membership: {
                        club_notes: formData.clubNotes,
                        requested_tiers: ["club"], // Required for club entitlement activation
                    },
                },
                { auth: true }
            );

            // Update context
            setClubReadinessData({
                availableDays: formData.availabilitySlots,
                clubNotes: formData.clubNotes,
            });
            markClubReadinessComplete();

            // Navigate to plan selection
            router.push("/upgrade/club/plan");
        } catch (e) {
            toast.error("Failed to save. Please try again.");
            console.error("Save error:", e);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading your profile..." />;
    }

    return (
        <div className="max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25">
                    <Calendar className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Set Your Availability</h1>
                <p className="text-slate-500">
                    Tell us when you're available so we can match you with the right sessions.
                </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <ClubReadinessStep
                    formData={formData}
                    onToggleAvailability={handleToggleAvailability}
                    onUpdateNotes={handleUpdateNotes}
                />
            </div>

            {/* Benefits */}
            <div className="bg-slate-50 rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Why we ask this</h4>
                <ul className="space-y-2">
                    {[
                        "Match you with sessions at your preferred times",
                        "Group you with swimmers on similar schedules",
                        "Send relevant session notifications only",
                    ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Continue button */}
            <Button
                onClick={handleSubmit}
                disabled={!isValid || saving}
                size="lg"
                className="w-full"
            >
                {saving ? "Saving..." : "Continue to Plan Selection"}
            </Button>

            <p className="text-center text-xs text-slate-400">
                You can update your availability anytime from your profile
            </p>
        </div>
    );
}
