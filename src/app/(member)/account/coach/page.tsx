"use client";

import { CoachStatusBadge } from "@/components/coaches/CoachStatusBadge";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatsCard } from "@/components/ui/StatsCard";
import { TagList } from "@/components/ui/TagList";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";
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
    const specialties: string[] = coachProfile?.coaching_specialties || [];
    const locations: string[] = coachProfile?.pools_supported || [];
    const locationLabels = locations.map(
        (loc) => locationOptions.find((o) => o.value === loc)?.label || loc
    );
    const sessionTypes: string[] = coachProfile?.preferred_cohort_types || [];

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
                <Link href="/account" className="text-sm text-slate-500 hover:text-slate-700">
                    ← Back to account
                </Link>
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
                <StatsCard
                    label="Active Cohorts"
                    value={stats.activeCohorts}
                    description="Cohorts currently in progress"
                    variant="simple"
                />
                <StatsCard
                    label="Active Swimmers"
                    value={stats.activeSwimmers}
                    description="Assignments will show here once linked"
                    variant="simple"
                />
                <StatsCard
                    label="Next 7 Days"
                    value={stats.next7Days}
                    description="Upcoming cohort starts"
                    variant="simple"
                />
                <StatsCard
                    label="Hours This Week"
                    value={`${stats.hoursThisWeek}h`}
                    description="Based on scheduled sessions"
                    variant="simple"
                />
            </div>

            {/* Earnings */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-500">Earnings (This Month)</p>
                            <p className="text-3xl font-bold text-slate-900 mt-1">
                                {formatNaira(stats.earningsThisMonth)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Earnings will appear once payouts are enabled.
                            </p>
                        </div>
                        <Badge variant="default">Pending: {formatNaira(stats.pendingPayouts)}</Badge>
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
                                <p className="text-sm text-slate-600">Cohorts you're assigned to.</p>
                            </div>
                            <Link href="/coach/onboarding">
                                <Button size="sm" variant="secondary">Update availability</Button>
                            </Link>
                        </div>

                        {cohorts.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600 space-y-2">
                                <p className="font-medium text-slate-800">You're approved and ready.</p>
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
                                    <Link key={cohort.id} href={`/account/academy/cohorts/${cohort.id}`} className="block">
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
                                <p className="text-sm text-slate-600">Sessions will appear once you're assigned.</p>
                            </div>
                            <Button size="sm" variant="outline">View calendar</Button>
                        </div>
                        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                            No sessions scheduled yet. You'll see them here once you're assigned to swimmers or cohorts.
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
                            <Link href="/account/members" className="text-cyan-700 hover:underline block">
                                View assigned swimmers
                            </Link>
                            <span className="text-slate-400 block">Session notes (enable when sessions exist)</span>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <h2 className="text-lg font-semibold text-slate-900 mb-3">Profile Snapshot</h2>
                        <p className="text-sm text-slate-600">Keep your profile updated to get matched faster.</p>
                        <div className="mt-3 space-y-3 text-sm">
                            <div>
                                <p className="font-semibold text-slate-900">{displayName}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-slate-500">Status:</span>
                                    {coachProfile?.status ? (
                                        <CoachStatusBadge status={coachProfile.status} />
                                    ) : (
                                        <span className="text-slate-400">—</span>
                                    )}
                                </div>
                                <p className="text-slate-500">
                                    Experience: {coachProfile?.coaching_years ?? 0} years
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Specialties</p>
                                <TagList
                                    items={specialties}
                                    maxItems={5}
                                    variant="slate"
                                    emptyText="Add specialties to your profile"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Locations</p>
                                <TagList
                                    items={locationLabels}
                                    maxItems={4}
                                    variant="slate"
                                    emptyText="Add coaching locations"
                                />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Session Types</p>
                                <TagList
                                    items={sessionTypes}
                                    maxItems={5}
                                    variant="slate"
                                    getLabel={(s) => s.replace("_", " ")}
                                    emptyText="Set session types in onboarding"
                                />
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
