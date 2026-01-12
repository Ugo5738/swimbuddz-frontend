"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { getMyCoachCohorts, type Cohort } from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type FilterStatus = "all" | "active" | "upcoming" | "completed";

const filterOptions = [
    { value: "all" as const, label: "All" },
    { value: "active" as const, label: "Active" },
    { value: "upcoming" as const, label: "Upcoming" },
    { value: "completed" as const, label: "Completed" },
];

export default function CoachCohortsPage() {
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterStatus>("all");

    useEffect(() => {
        getMyCoachCohorts()
            .then(setCohorts)
            .catch((err) => {
                console.error("Failed to load cohorts", err);
                setError("Failed to load your cohorts. Please try again.");
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredCohorts = useMemo(() => {
        const now = Date.now();
        return cohorts.filter((c) => {
            if (filter === "all") return true;
            if (filter === "active") return c.status === "active";
            if (filter === "completed")
                return c.status === "completed" || c.status === "cancelled";
            if (filter === "upcoming") {
                const start = Date.parse(c.start_date);
                return (
                    Number.isFinite(start) &&
                    start > now &&
                    c.status !== "completed" &&
                    c.status !== "cancelled"
                );
            }
            return true;
        });
    }, [cohorts, filter]);

    if (loading) {
        return <LoadingCard text="Loading your cohorts..." />;
    }

    if (error) {
        return (
            <Alert variant="error" title="Error">
                {error}
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <Link
                    href="/coach/dashboard"
                    className="text-sm text-slate-500 hover:text-slate-700"
                >
                    ← Back to dashboard
                </Link>
                <h1 className="text-3xl font-bold text-slate-900 mt-2">My Cohorts</h1>
                <p className="text-slate-600 mt-1">
                    View and manage all cohorts you're assigned to teach.
                </p>
            </header>

            {/* Filter Tabs */}
            <FilterTabs
                options={filterOptions}
                value={filter}
                onChange={setFilter}
            />

            {/* Cohorts Grid */}
            {filteredCohorts.length === 0 ? (
                <Card className="p-8 text-center">
                    <GraduationCap className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl font-semibold text-slate-700 mb-2">
                        {filter === "all"
                            ? "No cohorts assigned yet"
                            : `No ${filter} cohorts`}
                    </h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {filter === "all"
                            ? "You'll see your assigned cohorts here once an admin assigns you to teach."
                            : `You don't have any ${filter} cohorts at the moment.`}
                    </p>
                    {filter === "all" && (
                        <div className="flex justify-center gap-3 mt-6">
                            <Link href="/coach/onboarding">
                                <Button>Update Availability</Button>
                            </Link>
                            <Link href="/coach/apply">
                                <Button variant="outline">Edit Profile</Button>
                            </Link>
                        </div>
                    )}
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCohorts.map((cohort) => (
                        <CohortCard key={cohort.id} cohort={cohort} />
                    ))}
                </div>
            )}
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

    const startDate = formatDate(cohort.start_date);
    const endDate = formatDate(cohort.end_date);

    return (
        <Link
            href={`/coach/cohorts/${cohort.id}`}
            className="block border rounded-lg p-5 hover:shadow-lg transition-shadow bg-white"
        >
            <div className="flex items-start justify-between mb-3">
                <Badge variant={statusVariant}>{cohort.status.toUpperCase()}</Badge>
                <span className="text-sm text-slate-500">{cohort.capacity} spots</span>
            </div>

            <h3 className="font-semibold text-lg text-slate-900 mb-1">
                {cohort.name || "Unnamed Cohort"}
            </h3>

            {cohort.program && (
                <p className="text-sm text-emerald-700 font-medium mb-3">
                    {cohort.program.name}
                </p>
            )}

            <div className="space-y-1 text-sm text-slate-600">
                <p>
                    <span className="text-slate-400">Dates:</span> {startDate} - {endDate}
                </p>
                {cohort.location_name && (
                    <p>
                        <span className="text-slate-400">Location:</span>{" "}
                        {cohort.location_name}
                    </p>
                )}
                {cohort.program && (
                    <p>
                        <span className="text-slate-400">Duration:</span>{" "}
                        {cohort.program.duration_weeks} weeks
                    </p>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
                <Button size="sm" variant="secondary" className="w-full">
                    View Students & Progress
                </Button>
            </div>
        </Link>
    );
}
