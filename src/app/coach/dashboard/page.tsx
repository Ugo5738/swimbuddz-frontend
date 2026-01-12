"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { StatsCard } from "@/components/ui/StatsCard";
import {
    calculateCohortStats,
    getMyCoachCohorts,
    type Cohort,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { Calendar, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CoachDashboardPage() {
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getMyCoachCohorts()
            .then(setCohorts)
            .catch((err) => {
                console.error("Failed to load cohorts", err);
                setError("Failed to load your cohorts. Please try again.");
            })
            .finally(() => setLoading(false));
    }, []);

    const stats = useMemo(() => calculateCohortStats(cohorts), [cohorts]);

    // Separate active and upcoming cohorts
    const activeCohorts = cohorts.filter((c) => c.status === "active");
    const upcomingCohorts = cohorts
        .filter((c) => {
            const start = Date.parse(c.start_date);
            return (
                Number.isFinite(start) &&
                start > Date.now() &&
                c.status !== "completed" &&
                c.status !== "cancelled"
            );
        })
        .sort((a, b) => Date.parse(a.start_date) - Date.parse(b.start_date))
        .slice(0, 5);

    if (loading) {
        return <LoadingCard text="Loading your dashboard..." />;
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
            {/* Header */}
            <header>
                <h1 className="text-3xl font-bold text-slate-900">Coach Dashboard</h1>
                <p className="text-slate-600 mt-1">
                    Manage your cohorts, track student progress, and view upcoming sessions.
                </p>
            </header>

            {/* Stats Overview */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    label="Active Cohorts"
                    value={stats.activeCohorts}
                    icon={<GraduationCap className="h-5 w-5" />}
                    color="green"
                    variant="elaborate"
                />
                <StatsCard
                    label="Upcoming Cohorts"
                    value={stats.upcomingCohorts}
                    icon={<Calendar className="h-5 w-5" />}
                    color="cyan"
                    variant="elaborate"
                />
                <StatsCard
                    label="Next 7 Days"
                    value={stats.next7Days}
                    icon={<Calendar className="h-5 w-5" />}
                    color="amber"
                    variant="elaborate"
                />
                <StatsCard
                    label="Completed"
                    value={stats.completedCohorts}
                    icon={<GraduationCap className="h-5 w-5" />}
                    color="slate"
                    variant="elaborate"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* My Cohorts - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Active Cohorts */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    My Cohorts
                                </h2>
                                <p className="text-sm text-slate-600">
                                    Cohorts you're currently teaching
                                </p>
                            </div>
                            <Link href="/coach/cohorts">
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </Link>
                        </div>

                        {activeCohorts.length === 0 && upcomingCohorts.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                                <GraduationCap className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                                <p className="text-slate-600 font-medium">
                                    No cohorts assigned yet
                                </p>
                                <p className="text-sm text-slate-500 mt-1">
                                    Cohorts will appear here once you're assigned by an admin.
                                </p>
                                <div className="flex justify-center gap-3 mt-4">
                                    <Link href="/coach/onboarding">
                                        <Button size="sm">Update Availability</Button>
                                    </Link>
                                    <Link href="/coach/apply">
                                        <Button size="sm" variant="outline">
                                            Edit Profile
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[...activeCohorts, ...upcomingCohorts]
                                    .slice(0, 4)
                                    .map((cohort) => (
                                        <CohortCard key={cohort.id} cohort={cohort} />
                                    ))}
                            </div>
                        )}
                    </Card>

                    {/* Upcoming Sessions Placeholder */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">
                                    Upcoming Sessions
                                </h2>
                                <p className="text-sm text-slate-600">
                                    Your scheduled teaching sessions
                                </p>
                            </div>
                            <Link href="/coach/schedule">
                                <Button variant="outline" size="sm">
                                    View Calendar
                                </Button>
                            </Link>
                        </div>

                        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                            <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600 font-medium">No sessions scheduled</p>
                            <p className="text-sm text-slate-500 mt-1">
                                Sessions will appear here once scheduled for your cohorts.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">
                            Quick Actions
                        </h2>
                        <div className="space-y-2">
                            <Link href="/coach/cohorts" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <GraduationCap className="h-4 w-4 mr-2" />
                                    View All Cohorts
                                </Button>
                            </Link>
                            <Link href="/coach/students" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <Users className="h-4 w-4 mr-2" />
                                    View Students
                                </Button>
                            </Link>
                            <Link href="/coach/schedule" className="block">
                                <Button variant="secondary" className="w-full justify-start">
                                    <Calendar className="h-4 w-4 mr-2" />
                                    View Schedule
                                </Button>
                            </Link>
                        </div>
                    </Card>

                    {/* Recent Activity Placeholder */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">
                            Recent Activity
                        </h2>
                        <div className="space-y-3 text-sm">
                            <p className="text-slate-500 italic">
                                Activity feed coming soon...
                            </p>
                            <p className="text-slate-400 text-xs">
                                You'll see student progress updates, new enrollments, and session
                                completions here.
                            </p>
                        </div>
                    </Card>

                    {/* Profile Card */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">
                            Your Profile
                        </h2>
                        <p className="text-sm text-slate-600 mb-4">
                            Keep your profile updated to get matched with the right students.
                        </p>
                        <div className="space-y-2">
                            <Link href="/coach/apply">
                                <Button size="sm" className="w-full">
                                    Edit Profile
                                </Button>
                            </Link>
                            <Link href="/coach/onboarding">
                                <Button size="sm" variant="outline" className="w-full">
                                    Update Availability
                                </Button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function CohortCard({ cohort }: { cohort: Cohort }) {
    const statusVariant =
        cohort.status === "active"
            ? "success"
            : cohort.status === "open"
              ? "info"
              : cohort.status === "completed"
                ? "default"
                : "warning";

    const startDate = formatDate(cohort.start_date, { includeYear: false });
    const endDate = formatDate(cohort.end_date, { includeYear: false });

    return (
        <Link
            href={`/coach/cohorts/${cohort.id}`}
            className="block border rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
            <div className="flex items-start justify-between mb-2">
                <Badge variant={statusVariant}>{cohort.status.toUpperCase()}</Badge>
                <span className="text-xs text-slate-500">{cohort.capacity} spots</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
                {cohort.name || cohort.program?.name || "Unnamed Cohort"}
            </h3>
            {cohort.program && (
                <p className="text-sm text-slate-600 mb-2">{cohort.program.name}</p>
            )}
            <div className="text-xs text-slate-500">
                <p>
                    {startDate} - {endDate}
                </p>
                {cohort.location_name && <p className="mt-1">{cohort.location_name}</p>}
            </div>
        </Link>
    );
}
