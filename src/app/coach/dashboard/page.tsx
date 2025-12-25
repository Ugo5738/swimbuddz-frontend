"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { supabase } from "@/lib/auth";
import { CoachApplicationResponse, CoachesApi } from "@/lib/coaches";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoachDashboardPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [coach, setCoach] = useState<CoachApplicationResponse | null>(null);

    useEffect(() => {
        const loadCoach = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/coach/apply");
                    return;
                }

                const status = await CoachesApi.getApplicationStatus();

                if (status.status !== "active") {
                    if (status.status === "approved") {
                        router.push("/coach/onboarding");
                    } else {
                        router.push("/coach/apply");
                    }
                    return;
                }

                const coachData = await CoachesApi.getMe();
                setCoach(coachData);
            } catch {
                router.push("/coach/apply");
            } finally {
                setLoading(false);
            }
        };

        loadCoach();
    }, [router]);

    if (loading) {
        return <LoadingCard text="Loading dashboard..." />;
    }

    if (!coach) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">
                                Welcome, {coach.display_name || coach.first_name}! 🏊‍♂️
                            </h1>
                            <p className="text-cyan-100 mt-1">Coach Dashboard</p>
                        </div>
                        <Link
                            href="/"
                            className="text-sm text-cyan-100 hover:text-white underline"
                        >
                            ← Back to SwimBuddz
                        </Link>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="p-6">
                        <div className="text-sm text-slate-500">Assigned Cohorts</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">0</div>
                    </Card>
                    <Card className="p-6">
                        <div className="text-sm text-slate-500">Assigned Swimmers</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">0</div>
                    </Card>
                    <Card className="p-6">
                        <div className="text-sm text-slate-500">Upcoming Sessions</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">0</div>
                    </Card>
                    <Card className="p-6">
                        <div className="text-sm text-slate-500">This Week</div>
                        <div className="text-3xl font-bold text-slate-900 mt-1">0h</div>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Assigned Cohorts */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Cohorts</h2>
                            <div className="text-center py-8 text-slate-500">
                                <div className="text-4xl mb-2">📋</div>
                                <p>No cohorts assigned yet.</p>
                                <p className="text-sm mt-1">
                                    Admins will assign you to cohorts based on your availability.
                                </p>
                            </div>
                        </Card>

                        {/* Upcoming Sessions */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Sessions</h2>
                            <div className="text-center py-8 text-slate-500">
                                <div className="text-4xl mb-2">📅</div>
                                <p>No upcoming sessions.</p>
                                <p className="text-sm mt-1">
                                    Sessions will appear here once you're assigned to cohorts.
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Profile Card */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Profile</h2>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="text-slate-500">Name:</span>{" "}
                                    <span className="font-medium">{coach.first_name} {coach.last_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Display Name:</span>{" "}
                                    <span className="font-medium">{coach.display_name || "Not set"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Experience:</span>{" "}
                                    <span className="font-medium">{coach.coaching_years} years</span>
                                </div>
                                <div>
                                    <span className="text-slate-500">Specialties:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {coach.coaching_specialties.map((s) => (
                                            <span
                                                key={s}
                                                className="px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <Link
                                    href="/coach/profile"
                                    className="text-sm text-cyan-600 hover:underline"
                                >
                                    Edit Profile →
                                </Link>
                            </div>
                        </Card>

                        {/* Quick Actions */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                            <div className="space-y-2">
                                <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm transition-colors">
                                    📅 Update Availability
                                </button>
                                <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm transition-colors">
                                    📝 Session Notes
                                </button>
                                <button className="w-full text-left px-4 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm transition-colors">
                                    📊 View Progress Reports
                                </button>
                            </div>
                        </Card>

                        {/* Join as Member */}
                        <Card className="p-6 bg-gradient-to-br from-cyan-50 to-white border-cyan-100">
                            <h2 className="text-lg font-semibold text-slate-900 mb-2">Join as a Swimmer?</h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Want to participate in community swims and events? You can optionally join as a member too.
                            </p>
                            <Link
                                href="/register"
                                className="text-sm text-cyan-600 hover:underline font-medium"
                            >
                                Join Community as a Swimmer →
                            </Link>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
