"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { supabase } from "@/lib/auth";
import { AgreementApi, AgreementStatus, CoachesApi, CoachOnboardingData } from "@/lib/coaches";
import { locationOptions } from "@/lib/options";
import { CheckCircle, FileSignature } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ONBOARDING_PREFS_KEY = "coach_onboarding_prefs";

const cohortTypeOptions = [
    { value: "group", label: "Group Sessions" },
    { value: "one_to_one", label: "1-on-1 Sessions" },
    { value: "academy", label: "Academy Cohorts" },
];

type OnboardingStep = "agreement" | "preferences";

export default function CoachOnboardingPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coachStatus, setCoachStatus] = useState<string | null>(null);
    const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | null>(null);
    const [currentStep, setCurrentStep] = useState<OnboardingStep>("agreement");

    const [formData, setFormData] = useState<CoachOnboardingData>({
        pools_supported: [],
        can_travel_between_pools: false,
        max_swimmers_per_session: 10,
        preferred_cohort_types: [],
    });

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/coach/apply");
                    return;
                }

                const status = await CoachesApi.getApplicationStatus();
                setCoachStatus(status.status);

                if (status.status === "active") {
                    router.push("/coach/dashboard");
                    return;
                }

                if (status.status !== "approved") {
                    router.push("/coach/apply");
                    return;
                }

                // Check agreement status
                try {
                    const agreementData = await AgreementApi.getAgreementStatus();
                    setAgreementStatus(agreementData);
                    // If agreement is signed, move to preferences step
                    if (agreementData.has_signed_current_version) {
                        setCurrentStep("preferences");
                    }
                } catch {
                    // Agreement endpoint might fail if coach profile doesn't exist yet
                    // Default to requiring agreement
                    setAgreementStatus(null);
                }

                // Restore saved preferences from localStorage (if any)
                try {
                    const saved = localStorage.getItem(ONBOARDING_PREFS_KEY);
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setFormData((prev) => ({ ...prev, ...parsed }));
                    }
                } catch {
                    // Ignore localStorage errors
                }
            } catch {
                router.push("/coach/apply");
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [router]);

    // Persist preferences to localStorage on change (debounced)
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (loading) return; // Don't save during initial load
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            try {
                localStorage.setItem(ONBOARDING_PREFS_KEY, JSON.stringify(formData));
            } catch {
                // Ignore localStorage errors (full, disabled, etc.)
            }
        }, 500);
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [formData, loading]);

    // Refresh agreement status when returning from agreement page
    const refreshAgreementStatus = async () => {
        try {
            const agreementData = await AgreementApi.getAgreementStatus();
            setAgreementStatus(agreementData);
            if (agreementData.has_signed_current_version) {
                setCurrentStep("preferences");
            }
        } catch {
            // ignore errors
        }
    };

    const toggleArrayValue = (field: keyof CoachOnboardingData, value: string) => {
        const current = (formData[field] as string[]) || [];
        const updated = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];
        setFormData({ ...formData, [field]: updated });
    };

    const toggleLocation = (value: string) => {
        const current = formData.pools_supported || [];
        const isRemote = value === "remote_global";

        if (isRemote) {
            // Remote stands alone; clear physicals and travel settings.
            setFormData({
                ...formData,
                pools_supported: current.includes(value) ? [] : [value],
                can_travel_between_pools: false,
                travel_radius_km: undefined,
            });
            return;
        }

        // If remote was selected, drop it when choosing a physical location.
        const withoutRemote = current.filter((v) => v !== "remote_global");
        const alreadySelected = withoutRemote.includes(value);
        const updated = alreadySelected
            ? withoutRemote.filter((v) => v !== value)
            : [...withoutRemote, value];

        setFormData({
            ...formData,
            pools_supported: updated,
        });
    };

    const handleSubmit = async () => {
        setError(null);
        setSubmitting(true);

        try {
            if ((formData.pools_supported || []).length === 0) {
                throw new Error("Please select at least one location you can coach at");
            }

            const preferred = formData.preferred_cohort_types || [];
            const wantsGroup = preferred.includes("group") || preferred.includes("academy");
            const wantsOneToOne = preferred.includes("one_to_one");
            const hasPhysicalLocation = (formData.pools_supported || []).some(
                (loc) => loc !== "remote_global"
            );

            const payload: CoachOnboardingData = {
                ...formData,
                accepts_one_on_one: wantsOneToOne,
                accepts_group_cohorts: wantsGroup,
                max_swimmers_per_session: wantsGroup
                    ? formData.max_swimmers_per_session || 10
                    : undefined,
                travel_radius_km:
                    formData.can_travel_between_pools && hasPhysicalLocation
                        ? formData.travel_radius_km
                        : undefined,
            };

            await CoachesApi.completeOnboarding(payload);
            // Clear saved preferences on successful onboarding
            try { localStorage.removeItem(ONBOARDING_PREFS_KEY); } catch { /* ignore */ }
            router.push("/coach/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to complete onboarding");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading..." />;
    }

    if (coachStatus !== "approved") {
        return null;
    }

    const hasGroupCohorts = (formData.preferred_cohort_types || []).some(
        (v) => v === "group" || v === "academy"
    );
    const hasPhysicalLocation = (formData.pools_supported || []).some(
        (loc) => loc !== "remote_global"
    );
    const isRemoteOnly = (formData.pools_supported || []).includes("remote_global");
    const showTravelRadius = formData.can_travel_between_pools && hasPhysicalLocation;

    const agreementSigned = agreementStatus?.has_signed_current_version ?? false;

    return (
        <div className="mx-auto max-w-2xl space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Complete Your Setup</h1>
                <p className="text-slate-600">
                    Complete the following steps to activate your coach account.
                </p>
            </header>

            {/* Step Indicator */}
            <div className="flex gap-2">
                <div
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                        currentStep === "agreement"
                            ? "bg-cyan-600 text-white"
                            : agreementSigned
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                    }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        {agreementSigned && <CheckCircle className="h-4 w-4" />}
                        1. Sign Agreement
                    </span>
                </div>
                <div
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors ${
                        currentStep === "preferences"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-500"
                    }`}
                >
                    2. Set Preferences
                </div>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            {/* Agreement Step */}
            {currentStep === "agreement" && (
                <Card className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                            <FileSignature className="h-6 w-6 text-cyan-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Sign Coach Agreement</h2>
                            <p className="text-sm text-slate-600">
                                Review and sign the SwimBuddz Coach Agreement to continue
                            </p>
                        </div>
                    </div>

                    {agreementSigned ? (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <div>
                                    <p className="font-medium text-green-800">Agreement Signed</p>
                                    <p className="text-sm text-green-600">
                                        Signed on {agreementStatus?.signed_at
                                            ? new Date(agreementStatus.signed_at).toLocaleDateString()
                                            : "recently"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="mt-4 w-full"
                                onClick={() => setCurrentStep("preferences")}
                            >
                                Continue to Preferences
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600">
                                Before you can start coaching, you must read and sign our Coach Agreement.
                                This agreement outlines your responsibilities, compensation structure, and
                                code of conduct.
                            </p>
                            <Link href="/coach/agreement?returnTo=/coach/onboarding">
                                <Button className="w-full">
                                    Review & Sign Agreement
                                </Button>
                            </Link>
                            <button
                                onClick={refreshAgreementStatus}
                                className="w-full text-sm text-cyan-600 hover:text-cyan-700"
                            >
                                I've already signed - refresh status
                            </button>
                        </div>
                    )}
                </Card>
            )}

            {/* Preferences Step */}
            {currentStep === "preferences" && (
                <Card className="p-6 space-y-8">
                    {/* Locations Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Locations</h2>

                        {/* Custom location toggle - has special mutual exclusion logic */}
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-semibold text-slate-700">
                                Where can you coach?
                                <span aria-hidden="true" className="text-rose-500">*</span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {locationOptions.map((opt) => {
                                    const isSelected = (formData.pools_supported || []).includes(opt.value);
                                    const isDisabled = isRemoteOnly && opt.value !== "remote_global";
                                    return (
                                        <label
                                            key={opt.value}
                                            className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                                                isSelected
                                                    ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                                                    : isDisabled
                                                    ? "border-slate-200 text-slate-400 cursor-not-allowed"
                                                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={isSelected}
                                                disabled={isDisabled}
                                                onChange={() => toggleLocation(opt.value)}
                                            />
                                            {opt.label}
                                        </label>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {hasPhysicalLocation && (
                            <Checkbox
                                label="I can travel between locations"
                                checked={formData.can_travel_between_pools || false}
                                onChange={(e) => setFormData({ ...formData, can_travel_between_pools: e.target.checked })}
                            />
                        )}
                    </div>

                    {/* Session Types Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Session Types</h2>

                        <OptionPillGroup
                            label="What types of sessions do you offer?"
                            options={cohortTypeOptions}
                            selected={formData.preferred_cohort_types || []}
                            onToggle={(value) => toggleArrayValue("preferred_cohort_types", value)}
                        />

                        {hasGroupCohorts && (
                            <Input
                                label="Max swimmers per session"
                                type="number"
                                min={1}
                                max={30}
                                className="w-24"
                                value={formData.max_swimmers_per_session || 10}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        max_swimmers_per_session: parseInt(e.target.value) || 10,
                                    })
                                }
                            />
                        )}

                        {showTravelRadius && (
                            <Input
                                label="Travel radius (km)"
                                type="number"
                                min={0}
                                className="w-32"
                                value={formData.travel_radius_km ?? ""}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        travel_radius_km:
                                            e.target.value === "" ? undefined : parseFloat(e.target.value),
                                    })
                                }
                            />
                        )}
                    </div>

                    {/* Submit */}
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                        <Button
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? "Saving..." : "Complete Setup & Go to Dashboard"}
                        </Button>
                        <p className="text-xs text-slate-500 text-center">
                            You can update these preferences anytime from your dashboard.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
