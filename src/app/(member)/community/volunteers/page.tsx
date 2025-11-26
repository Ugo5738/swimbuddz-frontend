"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Users, CheckCircle } from "lucide-react";
import { apiEndpoints } from "@/lib/config";

interface VolunteerRole {
    id: string;
    title: string;
    description: string;
    category: string;
    is_active: boolean;
    slots_available: number | null;
    interested_count: number;
}

const categoryLabels: Record<string, string> = {
    media: "Media & Photography",
    logistics: "Logistics Support",
    admin: "Administrative",
    coaching_support: "Coaching Assistant",
    lane_marshal: "Lane Marshal",
};

export default function VolunteerHubPage() {
    const [roles, setRoles] = useState<VolunteerRole[]>([]);
    const [myInterests, setMyInterests] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRoles();
        fetchMyInterests();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await fetch(`${apiEndpoints.volunteers}/roles`);
            if (response.ok) {
                const data = await response.json();
                setRoles(data);
            }
        } catch (error) {
            console.error("Failed to fetch volunteer roles:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyInterests = async () => {
        try {
            // TODO: Get actual member_id from auth and fetch their interests
            // For now, using empty array
            setMyInterests([]);
        } catch (error) {
            console.error("Failed to fetch interests:", error);
        }
    };

    const handleRegisterInterest = async (roleId: string) => {
        try {
            // TODO: Get actual member_id from auth context
            const memberId = "temp-member-id";

            const response = await fetch(
                `${apiEndpoints.volunteers}/interest?member_id=${memberId}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ role_id: roleId }),
                }
            );

            if (response.ok) {
                setMyInterests([...myInterests, roleId]);
                await fetchRoles(); // Refresh to update interested_count
            }
        } catch (error) {
            console.error("Failed to register interest:", error);
        }
    };

    const activeRoles = roles.filter((role) => role.is_active);

    return (
        <div className="mx-auto max-w-6xl space-y-6 py-4 md:py-8">
            {/* Header */}
            <header className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Volunteer Hub</h1>
                <p className="text-sm md:text-base text-slate-600">
                    Help make SwimBuddz even better by volunteering your time and skills.
                </p>
            </header>

            {/* Info Banner */}
            <Card className="bg-cyan-50 p-6">
                <h3 className="font-semibold text-cyan-900">Why Volunteer?</h3>
                <p className="mt-2 text-sm text-cyan-800">
                    Volunteering is a great way to give back to the community, develop new skills, and
                    connect with other members. Whether you're interested in photography, logistics, or
                    coaching support, there's a role for you!
                </p>
            </Card>

            {/* My Interests */}
            {myInterests.length > 0 && (
                <Card className="p-6">
                    <h3 className="mb-4 font-semibold text-slate-900">My Volunteer Interests</h3>
                    <div className="flex flex-wrap gap-3">
                        {myInterests.map((roleId) => {
                            const role = roles.find((r) => r.id === roleId);
                            return role ? (
                                <div
                                    key={roleId}
                                    className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700"
                                >
                                    <CheckCircle className="h-4 w-4" />
                                    {role.title}
                                </div>
                            ) : null;
                        })}
                    </div>
                </Card>
            )}

            {/* Available Roles */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Available Volunteer Roles</h2>

                {loading ? (
                    <LoadingPage text="Loading volunteer roles..." />
                ) : activeRoles.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                            No active roles at the moment
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Check back soon for new volunteer opportunities!
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {activeRoles.map((role) => {
                            const hasRegistered = myInterests.includes(role.id);
                            const isFull = role.slots_available && role.interested_count >= role.slots_available;

                            return (
                                <Card key={role.id} className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-3">
                                            {/* Title & Category */}
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-lg font-semibold text-slate-900">{role.title}</h3>
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                                                        {categoryLabels[role.category] || role.category}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-slate-700">{role.description}</p>

                                            {/* Slots Info */}
                                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                                {role.slots_available && (
                                                    <div>
                                                        <span className="font-medium">{role.interested_count}</span> /{" "}
                                                        {role.slots_available} interested
                                                    </div>
                                                )}
                                                {!role.slots_available && (
                                                    <div>
                                                        <span className="font-medium">{role.interested_count}</span>{" "}
                                                        member{role.interested_count !== 1 ? "s" : ""} interested
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div>
                                            {hasRegistered ? (
                                                <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
                                                    <CheckCircle className="h-4 w-4" />
                                                    Registered
                                                </div>
                                            ) : (
                                                <Button
                                                    onClick={() => handleRegisterInterest(role.id)}
                                                    disabled={!!isFull}
                                                >
                                                    {isFull ? "Full" : "Register Interest"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
