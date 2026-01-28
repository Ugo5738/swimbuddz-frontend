"use client";

import { OptionPillGroup } from "@/components/forms/OptionPillGroup";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { getCoachProfile, updateCoachPreferences } from "@/lib/coach";
import { locationOptions } from "@/lib/options";
import { Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const cohortTypeOptions = [
    { value: "group", label: "Group Sessions" },
    { value: "one_to_one", label: "1-on-1 Sessions" },
    { value: "academy", label: "Academy Cohorts" },
];

export default function CoachPreferencesPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [poolsSupported, setPoolsSupported] = useState<string[]>([]);
    const [canTravel, setCanTravel] = useState(false);
    const [travelRadius, setTravelRadius] = useState<number | undefined>();
    const [preferredCohortTypes, setPreferredCohortTypes] = useState<string[]>([]);
    const [maxSwimmers, setMaxSwimmers] = useState(10);
    const [showInDirectory, setShowInDirectory] = useState(true);

    useEffect(() => {
        async function loadPreferences() {
            try {
                const profile = await getCoachProfile();
                if (profile) {
                    setPoolsSupported(profile.pools_supported || []);
                    setPreferredCohortTypes(profile.preferred_cohort_types || []);
                    setShowInDirectory(profile.show_in_directory ?? true);
                }
            } catch (err) {
                console.error("Failed to load preferences", err);
                setError("Failed to load your preferences");
            } finally {
                setLoading(false);
            }
        }

        loadPreferences();
    }, []);

    const toggleLocation = (value: string) => {
        const isRemote = value === "remote_global";

        if (isRemote) {
            // Remote stands alone
            setPoolsSupported((prev) =>
                prev.includes(value) ? [] : [value]
            );
            setCanTravel(false);
            setTravelRadius(undefined);
            return;
        }

        // Remove remote if selecting physical
        setPoolsSupported((prev) => {
            const withoutRemote = prev.filter((v) => v !== "remote_global");
            const alreadySelected = withoutRemote.includes(value);
            return alreadySelected
                ? withoutRemote.filter((v) => v !== value)
                : [...withoutRemote, value];
        });
    };

    const toggleCohortType = (value: string) => {
        setPreferredCohortTypes((prev) =>
            prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value]
        );
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);

        try {
            if (poolsSupported.length === 0) {
                throw new Error("Please select at least one location");
            }

            await updateCoachPreferences({
                pools_supported: poolsSupported,
                can_travel_between_pools: canTravel,
                travel_radius_km: canTravel ? travelRadius : undefined,
                preferred_cohort_types: preferredCohortTypes,
                max_swimmers_per_session: preferredCohortTypes.some(
                    (t) => t === "group" || t === "academy"
                )
                    ? maxSwimmers
                    : undefined,
                show_in_directory: showInDirectory,
            });

            toast.success("Preferences saved successfully!");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to save";
            setError(message);
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading preferences..." />;
    }

    const isRemoteOnly = poolsSupported.includes("remote_global");
    const hasPhysicalLocation = poolsSupported.some((loc) => loc !== "remote_global");
    const hasGroupCohorts = preferredCohortTypes.some(
        (v) => v === "group" || v === "academy"
    );

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Preferences</h1>
                <p className="text-slate-600 mt-1">
                    Update your coaching availability and preferences.
                </p>
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Card className="p-6 space-y-6">
                {/* Visibility */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Visibility</h2>
                    <Checkbox
                        label="Show my profile in the public coach directory"
                        checked={showInDirectory}
                        onChange={(e) => setShowInDirectory(e.target.checked)}
                    />
                </div>

                {/* Locations */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Locations</h2>
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium text-slate-700">
                            Where can you coach?
                        </legend>
                        <div className="flex flex-wrap gap-2">
                            {locationOptions.map((opt) => {
                                const isSelected = poolsSupported.includes(opt.value);
                                const isDisabled = isRemoteOnly && opt.value !== "remote_global";
                                return (
                                    <label
                                        key={opt.value}
                                        className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${isSelected
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
                            checked={canTravel}
                            onChange={(e) => setCanTravel(e.target.checked)}
                        />
                    )}

                    {canTravel && hasPhysicalLocation && (
                        <Input
                            label="Travel radius (km)"
                            type="number"
                            min={0}
                            className="w-32"
                            value={travelRadius ?? ""}
                            onChange={(e) =>
                                setTravelRadius(
                                    e.target.value === ""
                                        ? undefined
                                        : parseFloat(e.target.value)
                                )
                            }
                        />
                    )}
                </div>

                {/* Session Types */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Session Types</h2>
                    <OptionPillGroup
                        label="What types of sessions do you offer?"
                        options={cohortTypeOptions}
                        selected={preferredCohortTypes}
                        onToggle={toggleCohortType}
                    />

                    {hasGroupCohorts && (
                        <Input
                            label="Max swimmers per session"
                            type="number"
                            min={1}
                            max={30}
                            className="w-24"
                            value={maxSwimmers}
                            onChange={(e) =>
                                setMaxSwimmers(parseInt(e.target.value) || 10)
                            }
                        />
                    )}
                </div>

                {/* Save */}
                <div className="pt-4 border-t">
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Save Preferences
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
