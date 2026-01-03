"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface PickupLocationInput {
    name: string;
    description: string;
    address: string;
}

const STEPS = [
    { title: "Area Details", description: "Name and identifier for the ride area" },
    { title: "Pickup Locations", description: "Add pickup points for this area" },
    { title: "Review & Create", description: "Review and save the ride area" },
];

export default function NewRideAreaPage() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Step 1: Area Details
    const [areaName, setAreaName] = useState("");
    const [areaSlug, setAreaSlug] = useState("");

    // Step 2: Pickup Locations
    const [pickupLocations, setPickupLocations] = useState<PickupLocationInput[]>([]);
    const [newLocation, setNewLocation] = useState<PickupLocationInput>({
        name: "",
        description: "",
        address: "",
    });

    const handleNameChange = (value: string) => {
        setAreaName(value);
        setAreaSlug(value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
    };

    const addPickupLocation = () => {
        if (!newLocation.name.trim()) {
            setError("Location name is required");
            return;
        }
        setPickupLocations([...pickupLocations, { ...newLocation }]);
        setNewLocation({ name: "", description: "", address: "" });
        setError("");
    };

    const removePickupLocation = (index: number) => {
        setPickupLocations(pickupLocations.filter((_, i) => i !== index));
    };

    const nextStep = () => {
        setError("");
        if (step === 0) {
            if (!areaName.trim() || !areaSlug.trim()) {
                setError("Area name and slug are required");
                return;
            }
        }
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        }
    };

    const prevStep = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError("");

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Step 1: Create the ride area
            const areaRes = await fetch(`${API_BASE_URL}/api/v1/transport/areas`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ name: areaName, slug: areaSlug }),
            });

            if (!areaRes.ok) {
                const errorData = await areaRes.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to create ride area");
            }

            const area = await areaRes.json();

            // Step 2: Create pickup locations
            for (const loc of pickupLocations) {
                const locRes = await fetch(`${API_BASE_URL}/api/v1/transport/areas/${area.id}/locations`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: loc.name,
                        description: loc.description || undefined,
                        address: loc.address || undefined,
                    }),
                });

                if (!locRes.ok) {
                    console.error("Failed to create pickup location:", loc.name);
                }
            }

            // Navigate back to transport page
            router.push("/admin/transport");
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Failed to create ride area");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
                    Admin · Transport
                </p>
                <h1 className="text-3xl font-bold text-slate-900">Create Ride Area</h1>
                <p className="text-slate-600 mt-1">
                    Set up a new ride share area with pickup locations
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex flex-wrap gap-3">
                {STEPS.map((s, index) => (
                    <div
                        key={s.title}
                        className={`flex min-w-[140px] flex-col rounded-xl border px-3 py-2 text-sm ${index === step
                            ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                            : index < step
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-500"
                            }`}
                    >
                        <span className="text-xs font-semibold uppercase">Step {index + 1}</span>
                        <span className="font-semibold">{s.title}</span>
                        <span className="text-xs">{s.description}</span>
                    </div>
                ))}
            </div>

            {error && <Alert variant="error">{error}</Alert>}

            <Card className="p-6 space-y-6">
                {/* Step 1: Area Details */}
                {step === 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Area Details</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Area Name *
                                </label>
                                <Input
                                    placeholder="e.g., Victoria Island"
                                    value={areaName}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Slug (URL identifier) *
                                </label>
                                <Input
                                    placeholder="victoria_island"
                                    value={areaSlug}
                                    onChange={(e) => setAreaSlug(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Auto-generated from name. Use lowercase letters, numbers, and underscores.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Pickup Locations */}
                {step === 1 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Pickup Locations</h2>
                        <p className="text-sm text-slate-600">
                            Add pickup points where riders will be collected in {areaName || "this area"}.
                        </p>

                        {/* Added locations list */}
                        {pickupLocations.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-slate-700">Added Locations ({pickupLocations.length})</h3>
                                <ul className="space-y-2">
                                    {pickupLocations.map((loc, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                                        >
                                            <div>
                                                <span className="font-medium text-slate-900">{loc.name}</span>
                                                {loc.description && (
                                                    <span className="text-sm text-slate-600 ml-2">— {loc.description}</span>
                                                )}
                                                {loc.address && (
                                                    <p className="text-xs text-slate-500 mt-0.5">📍 {loc.address}</p>
                                                )}
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => removePickupLocation(index)}
                                            >
                                                Remove
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Add new location form */}
                        <Card className="p-4 bg-slate-50 space-y-3">
                            <h3 className="text-sm font-semibold text-slate-800">Add New Location</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <Input
                                        placeholder="Location name (e.g., Gate 1, Shoprite)"
                                        value={newLocation.name}
                                        onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Input
                                        placeholder="Description (optional)"
                                        value={newLocation.description}
                                        onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Input
                                        placeholder="Street address (optional)"
                                        value={newLocation.address}
                                        onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={addPickupLocation}>
                                + Add Location
                            </Button>
                        </Card>

                        {pickupLocations.length === 0 && (
                            <p className="text-sm text-amber-600 italic">
                                💡 Tip: Add at least one pickup location to make this area useful.
                            </p>
                        )}
                    </div>
                )}

                {/* Step 3: Review & Create */}
                {step === 2 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Review & Create</h2>
                        <p className="text-sm text-slate-600">
                            Review the ride area details before creating.
                        </p>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-800 mb-2">Area Details</h3>
                                <div className="text-sm text-slate-700 space-y-1">
                                    <p><strong>Name:</strong> {areaName}</p>
                                    <p><strong>Slug:</strong> {areaSlug}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                                    Pickup Locations ({pickupLocations.length})
                                </h3>
                                {pickupLocations.length > 0 ? (
                                    <ul className="text-sm text-slate-700 space-y-1">
                                        {pickupLocations.map((loc, index) => (
                                            <li key={index}>
                                                <strong>{loc.name}</strong>
                                                {loc.description && ` — ${loc.description}`}
                                                {loc.address && (
                                                    <span className="text-slate-500 block text-xs">📍 {loc.address}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No pickup locations added.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t border-slate-200">
                    <Button
                        variant="secondary"
                        onClick={step === 0 ? () => router.push("/admin/transport") : prevStep}
                        disabled={loading}
                    >
                        {step === 0 ? "Cancel" : "Back"}
                    </Button>
                    {step < STEPS.length - 1 ? (
                        <Button onClick={nextStep}>Continue</Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? "Creating..." : "Create Ride Area"}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
}
