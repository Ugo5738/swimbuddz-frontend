"use client";

import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { AcademyApi, Cohort, Program } from "@/lib/academy";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminAcademyPage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [transitioningStatuses, setTransitioningStatuses] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                const [programsData, cohortsData] = await Promise.all([
                    AcademyApi.listPrograms(),
                    AcademyApi.listCohorts()
                ]);
                setPrograms(programsData);
                setCohorts(cohortsData);
            } catch (error) {
                console.error("Failed to load academy data", error);
                toast.error("Failed to load academy data");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const handleTransitionCohortStatuses = async () => {
        setTransitioningStatuses(true);
        try {
            await AcademyApi.triggerCohortStatusTransitions();
            toast.success("Cohort statuses updated successfully");
            // Reload cohorts to reflect changes
            const cohortsData = await AcademyApi.listCohorts();
            setCohorts(cohortsData);
        } catch (error) {
            console.error("Failed to transition cohort statuses", error);
            toast.error("Failed to update cohort statuses");
        } finally {
            setTransitioningStatuses(false);
        }
    };

    if (loading) {
        return <LoadingPage text="Loading academy data..." />;
    }

    const statusColors: Record<string, string> = {
        active: "text-green-600 bg-green-50",
        open: "text-blue-600 bg-blue-50",
        completed: "text-slate-600 bg-slate-100",
        draft: "text-amber-600 bg-amber-50",
    };

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <header className="space-y-3">
                <div className="space-y-1">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Academy Management</h1>
                    <p className="text-sm text-slate-600">Manage programs, cohorts, and enrollments.</p>
                </div>

                {/* Action Buttons - Horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0">
                    <button
                        onClick={handleTransitionCohortStatuses}
                        disabled={transitioningStatuses}
                        className="flex-shrink-0 rounded-lg bg-purple-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        title="Update cohort statuses based on dates"
                    >
                        {transitioningStatuses ? "..." : "⚡ Update Cohort Statuses"}
                    </button>
                    <button
                        onClick={() => router.push("/admin/academy/programs/new")}
                        className="flex-shrink-0 rounded-lg bg-cyan-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-cyan-700 whitespace-nowrap"
                    >
                        Create Program
                    </button>
                    <button
                        onClick={() => router.push("/admin/academy/cohorts/new")}
                        className="flex-shrink-0 rounded-lg bg-cyan-600 px-3 py-2 text-xs md:text-sm font-medium text-white hover:bg-cyan-700 whitespace-nowrap"
                    >
                        Create Cohort
                    </button>
                </div>
            </header>

            {/* Content Grid - Stack on mobile */}
            <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                {/* Programs Section */}
                <div className="space-y-3">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">Programs</h2>
                    {programs.length === 0 ? (
                        <Card className="p-4 md:p-6">
                            <p className="text-slate-500 text-sm">No programs found.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {programs.map((program) => (
                                <Card
                                    key={program.id}
                                    className="p-3 md:p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-slate-50"
                                    onClick={() => router.push(`/admin/academy/programs/${program.id}`)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-medium text-slate-900 text-sm md:text-base truncate">
                                                {program.name}
                                            </h3>
                                            <p className="text-xs md:text-sm text-slate-600 line-clamp-2 mt-1">
                                                {program.description || "No description"}
                                            </p>
                                        </div>
                                        <span className="flex-shrink-0 text-xs font-medium uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                            {program.level}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-2">
                                        {program.duration_weeks} weeks
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cohorts Section */}
                <div className="space-y-3">
                    <h2 className="text-lg md:text-xl font-semibold text-slate-900">Cohorts</h2>
                    {cohorts.length === 0 ? (
                        <Card className="p-4 md:p-6">
                            <p className="text-slate-500 text-sm">No cohorts found.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2 md:space-y-3">
                            {cohorts.map((cohort) => (
                                <Card
                                    key={cohort.id}
                                    className="p-3 md:p-4 cursor-pointer hover:shadow-md transition-shadow active:bg-slate-50"
                                    onClick={() => router.push(`/admin/academy/cohorts/${cohort.id}`)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-medium text-slate-900 text-sm md:text-base truncate min-w-0 flex-1">
                                            {cohort.name}
                                        </h3>
                                        <span className={`flex-shrink-0 text-xs font-medium uppercase px-2 py-0.5 rounded ${statusColors[cohort.status] || "text-slate-500 bg-slate-100"
                                            }`}>
                                            {cohort.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-slate-600 mt-2">
                                        <span>
                                            📅 {new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()}
                                        </span>
                                        <span>👥 {cohort.capacity} spots</span>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
