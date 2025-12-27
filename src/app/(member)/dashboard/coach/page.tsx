"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { locationOptions } from "@/lib/options";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Cohort = {
    id: string;
    program_id: string;
    start_date: string;
    end_date: string;
    capacity: number;
    status: "open" | "active" | "completed" | "cancelled";
    coach_id: string;
};

export default function CoachDashboardPage() {
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [member, setMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            apiGet<Cohort[]>("/api/v1/academy/cohorts/coach/me", { auth: true }),
            apiGet("/api/v1/members/me", { auth: true }),
        ])
            .then(([cohortData, memberData]) => {
                setCohorts(cohortData);
                setMember(memberData);
            })
            .catch((err) => {
                console.error("Failed to load coach data", err);
                setError("Failed to load coach dashboard.");
            })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => {
        const activeCohorts = cohorts.filter((c) => c.status === "active").length;
        const upcoming = cohorts.filter((c) => {
            const start = Date.parse(c.start_date);
            return Number.isFinite(start) && start >= Date.now() && c.status !== "completed" && c.status !== "cancelled";
        }).length;
        return {
            activeCohorts,
            activeSwimmers: 0, // placeholder until swimmer assignment API is available
            next7Days: upcoming,
            hoursThisWeek: 0,
            earningsThisMonth: 0,
            pendingPayouts: 0,
        };
    }, [cohorts]);

    const coachProfile = member?.coach_profile || null;
    const displayName =
        coachProfile?.display_name ||
        `${member?.first_name || "Coach"} ${member?.last_name || ""}`.trim();
    const specialties = coachProfile?.coaching_specialties || [];
    const topSpecialties = specialties.slice(0, 5);
    const extraSpecialties = Math.max(0, specialties.length - topSpecialties.length);
    const locations = coachProfile?.pools_supported || [];
    const locationLabels = locations
        .map((loc: string) => locationOptions.find((o) => o.value === loc)?.label || loc)
        .slice(0, 4);
    const extraLocations = Math.max(0, locations.length - locationLabels.length);
    const sessionTypes = coachProfile?.preferred_cohort_types || [];

    if (loading) {
        return <LoadingCard text="Loading coach dashboard..." />;
    }

    if (error) {
        return (
            <Alert variant="error" title="Error">
                {error}
            </Alert>
        );
    }

    return (
        <div className="space-y-8">
            <header className="space-y-2">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">
                        ← Back
                    </Link>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Coach Dashboard</h1>
                        <p className="text-slate-600">Track your cohorts, sessions, and readiness.</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/coach/onboarding">
                            <Button variant="secondary">Update availability</Button>
                        </Link>
                        <Link href="/coach/apply">
                            <Button variant="outline">Edit coaching profile</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Active Cohorts</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeCohorts}</p>
                    <p className="text-xs text-slate-500 mt-1">Cohorts currently in progress</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Active Swimmers</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.activeSwimmers}</p>
                    <p className="text-xs text-slate-500 mt-1">Assignments will show here once linked</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Next 7 Days</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.next7Days}</p>
                    <p className="text-xs text-slate-500 mt-1">Upcoming cohort starts</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Hours This Week</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.hoursThisWeek}h</p>
                    <p className="text-xs text-slate-500 mt-1">Based on scheduled sessions</p>
                </Card>
            </div>

            {/* Earnings */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Earnings (This Month)</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">₦{stats.earningsThisMonth.toFixed(2)}</p>
                            <p className="text-xs text-slate-500 mt-1">
                                Earnings will appear once payouts are enabled.
                            </p>
                        </div>
                        <Badge variant="default">Pending: ₦{stats.pendingPayouts.toFixed(2)}</Badge>
                    </div>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-slate-500">Payout Schedule</p>
                    <p className="text-lg font-semibold text-slate-900 mt-2">Monthly payouts</p>
                    <p className="text-sm text-slate-600 mt-1">
                        Payouts are issued after attendance is confirmed. Add your bank details in Profile.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <Button variant="secondary">Add bank details</Button>
                        <Button variant="outline">View payout policy</Button>
                    </div>
                </Card>
            </div>

            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Your Cohorts</h2>
                                <p className="text-sm text-slate-600">Cohorts you’re assigned to.</p>
                            </div>
                            <Link href="/coach/onboarding">
                                <Button size="sm" variant="secondary">Update availability</Button>
                            </Link>
                        </div>

                        {cohorts.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600 space-y-2">
                                <p className="font-medium text-slate-800">You’re approved and ready.</p>
                                <p>Cohorts will be assigned based on your availability and specialties.</p>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    <Link href="/coach/onboarding">
                                        <Button size="sm">Update availability</Button>
                                    </Link>
                                    <Link href="/coach/apply">
                                        <Button size="sm" variant="outline">Edit coaching profile</Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2">
                                {cohorts.map((cohort) => (
                                    <Link key={cohort.id} href={`/dashboard/academy/cohorts/${cohort.id}`} className="block">
                                        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge variant={cohort.status === "active" ? "success" : "default"}>
                                                    {cohort.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-slate-500">
                                                    {new Date(cohort.start_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-lg text-slate-900 mb-1">
                                                Cohort {cohort.id.slice(0, 8)}...
                                            </h3>
                                            <p className="text-sm text-slate-600">Capacity: {cohort.capacity} students</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Upcoming Sessions</h2>
                                <p className="text-sm text-slate-600">Sessions will appear once you’re assigned.</p>
                            </div>
                            <Button size="sm" variant="outline">View calendar</Button>
                        </div>
                        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                            No sessions scheduled yet. You’ll see them here once you’re assigned to swimmers or cohorts.
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-3">Quick Actions</h2>
                        <div className="space-y-2 text-sm">
                            <Link href="/coach/onboarding" className="text-cyan-700 hover:underline block">
                                Update availability
                            </Link>
                            <Link href="/coach/apply" className="text-cyan-700 hover:underline block">
                                Edit coaching profile
                            </Link>
                            <Link href="/dashboard/members" className="text-cyan-700 hover:underline block">
                                View assigned swimmers
                            </Link>
                            <span className="text-slate-400 block">Session notes (enable when sessions exist)</span>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-3">Profile Snapshot</h2>
                        <p className="text-sm text-slate-600">Keep your profile updated to get matched faster.</p>
                        <div className="mt-3 space-y-2 text-sm">
                            <div>
                                <p className="font-semibold text-slate-900">{displayName}</p>
                                <p className="text-slate-500">Status: {coachProfile?.status || "—"}</p>
                                <p className="text-slate-500">
                                    Experience: {coachProfile?.coaching_years ?? 0} years
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Specialties</p>
                                <div className="flex flex-wrap gap-1">
                                    {topSpecialties.map((s: string) => (
                                        <span
                                            key={s}
                                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs"
                                        >
                                            {s}
                                        </span>
                                    ))}
                                    {extraSpecialties > 0 && (
                                        <span className="px-2 py-0.5 text-slate-400 text-xs">
                                            +{extraSpecialties} more
                                        </span>
                                    )}
                                    {topSpecialties.length === 0 && (
                                        <span className="text-slate-400">Add specialties to your profile</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Locations</p>
                                <div className="flex flex-wrap gap-1">
                                    {locationLabels.map((loc: string) => (
                                        <span
                                            key={loc}
                                            className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs"
                                        >
                                            {loc}
                                        </span>
                                    ))}
                                    {extraLocations > 0 && (
                                        <span className="px-2 py-0.5 text-slate-400 text-xs">+{extraLocations} more</span>
                                    )}
                                    {locationLabels.length === 0 && (
                                        <span className="text-slate-400">Add coaching locations</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Session Types</p>
                                <div className="flex flex-wrap gap-1">
                                    {sessionTypes.length > 0 ? (
                                        sessionTypes.map((s: string) => (
                                            <span
                                                key={s}
                                                className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs"
                                            >
                                                {s.replace("_", " ")}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-slate-400">Set session types in onboarding</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Link href="/coach/apply">
                                <Button size="sm">Edit profile</Button>
                            </Link>
                            <Link href="/coach/onboarding">
                                <Button size="sm" variant="outline">
                                    Edit preferences
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
