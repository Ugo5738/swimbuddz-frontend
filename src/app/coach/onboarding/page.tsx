"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { supabase } from "@/lib/auth";
import { CoachesApi, CoachOnboardingData } from "@/lib/coaches";
import { locationOptions } from "@/lib/options";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoachOnboardingPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coachStatus, setCoachStatus] = useState<string | null>(null);

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
                    router.push("/account/coach");
                    return;
                }

                if (status.status !== "approved") {
                    router.push("/coach/apply");
                    return;
                }
            } catch {
                router.push("/coach/apply");
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, [router]);

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
            router.push("/account/coach");
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

    const cohortTypeOptions = [
        { value: "group", label: "Group Sessions" },
        { value: "one_to_one", label: "1-on-1 Sessions" },
        { value: "academy", label: "Academy Cohorts" },
    ];
    const hasGroupCohorts = (formData.preferred_cohort_types || []).some(
        (v) => v === "group" || v === "academy"
    );
    const hasPhysicalLocation = (formData.pools_supported || []).some(
        (loc) => loc !== "remote_global"
    );
    const showTravelRadius = formData.can_travel_between_pools && hasPhysicalLocation;

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl space-y-8">
                <div className="text-center">
                    <div className="text-4xl mb-2">🎉</div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Welcome to SwimBuddz Coaching!
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Let's set up your coaching preferences so we can match you with swimmers.
                    </p>
                </div>

                {error && <Alert variant="error">{error}</Alert>}

                <Card className="p-6 space-y-8">
                    {/* Locations Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Locations</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Where can you coach? <span className="text-red-500">*</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {locationOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleLocation(opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${(formData.pools_supported || []).includes(opt.value)
                                            ? "bg-cyan-100 border-cyan-500 text-cyan-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                        disabled={
                                            (formData.pools_supported || []).includes("remote_global") &&
                                            opt.value !== "remote_global"
                                        }
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="travel"
                                checked={formData.can_travel_between_pools || false}
                                onChange={(e) => setFormData({ ...formData, can_travel_between_pools: e.target.checked })}
                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="travel" className="text-sm text-slate-700">
                                I can travel between locations
                            </label>
                        </div>
                    </div>

                    {/* Session Types Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Session Types</h2>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                What types of sessions do you offer?
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {cohortTypeOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => toggleArrayValue("preferred_cohort_types", opt.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${(formData.preferred_cohort_types || []).includes(opt.value)
                                            ? "bg-cyan-100 border-cyan-500 text-cyan-700"
                                            : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {hasGroupCohorts && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Max swimmers per session
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    className="w-24 rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                    value={formData.max_swimmers_per_session || 10}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            max_swimmers_per_session: parseInt(e.target.value) || 10,
                                        })
                                    }
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Travel radius (km)
                                </label>
                                {showTravelRadius ? (
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
                                        value={formData.travel_radius_km ?? ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                travel_radius_km:
                                                    e.target.value === "" ? undefined : parseFloat(e.target.value),
                                            })
                                        }
                                    />
                                ) : (
                                    <p className="text-sm text-slate-500">
                                        Enable travel between locations to set a travel radius.
                                    </p>
                                )}
                            </div>
                        </div>
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
            </div>
        </div>
    );
}
