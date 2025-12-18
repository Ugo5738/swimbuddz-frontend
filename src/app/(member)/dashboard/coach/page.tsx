"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

// We can move this to a shared types file later
type Cohort = {
    id: string;
    program_id: string;
    start_date: string;
    end_date: string;
    capacity: number;
    status: "open" | "active" | "completed" | "cancelled";
    coach_id: string;
    // We would need to fetch program details or have them joined
    // For now we might just show ID or fetch program separately
    // Ideally the API should return program name or nested program
};

// Update CohortResponse in backend to include Program name?
// The current list_my_coach_cohorts returns CohortResponse which is flat.
// Let's stick to flat for now and maybe fetch programs or just show date/status.
// Actually, without program name it's hard to know what cohort it is.
// I should probably update the backend to include program details, or fetch all programs and map them.
// Let's assume we can fetch programs too.

export default function CoachDashboardPage() {
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        apiGet<Cohort[]>("/api/v1/academy/cohorts/coach/me", { auth: true })
            .then((data) => setCohorts(data))
            .catch((err) => {
                console.error("Failed to load coach cohorts", err);
                setError("Failed to load cohorts.");
            })
            .finally(() => setLoading(false));
    }, []);

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
        <div className="space-y-6">
            <header className="space-y-2">
                <div className="flex items-center gap-2">
                    <Link href="/dashboard" className="text-slate-500 hover:text-slate-700">← Back</Link>
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Coach Dashboard</h1>
                <p className="text-slate-600">Manage your assigned cohorts and student progress.</p>
            </header>

            <div className="grid gap-6">
                <Card>
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">My Cohorts</h2>

                    {cohorts.length === 0 ? (
                        <p className="text-slate-600">You have no assigned cohorts yet.</p>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {cohorts.map((cohort) => (
                                <Link key={cohort.id} href={`/dashboard/academy/cohorts/${cohort.id}`} className="block">
                                    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge variant={cohort.status === 'active' ? 'success' : 'default'}>
                                                {cohort.status.toUpperCase()}
                                            </Badge>
                                            <span className="text-sm text-slate-500">
                                                {new Date(cohort.start_date).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-lg text-slate-900 mb-1">
                                            Cohort {cohort.id.slice(0, 8)}...
                                        </h3>
                                        <p className="text-sm text-slate-600">
                                            Capacity: {cohort.capacity} students
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
