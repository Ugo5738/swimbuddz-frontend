"use client";

import { Card } from "@/components/ui/Card";
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

    const handleDeleteProgram = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this program?")) return;
        try {
            await AcademyApi.deleteProgram(id);
            setPrograms(prev => prev.filter(p => p.id !== id));
            toast.success("Program deleted");
        } catch (error) {
            console.error("Failed to delete program", error);
            toast.error("Failed to delete program");
        }
    };

    const handleDeleteCohort = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this cohort?")) return;
        try {
            await AcademyApi.deleteCohort(id);
            setCohorts(prev => prev.filter(c => c.id !== id));
            toast.success("Cohort deleted");
        } catch (error) {
            console.error("Failed to delete cohort", error);
            toast.error("Failed to delete cohort");
        }
    };

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
        return <div>Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-slate-900">Academy Management</h1>
                    <p className="text-slate-600">Manage programs, cohorts, and enrollments.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleTransitionCohortStatuses}
                        disabled={transitioningStatuses}
                        className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Update cohort statuses (OPEN→ACTIVE, ACTIVE→COMPLETED) based on dates"
                    >
                        {transitioningStatuses ? "Updating..." : "⚡ Update Cohort Statuses"}
                    </button>
                    <button
                        onClick={() => router.push("/admin/academy/programs/new")}
                        className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                    >
                        Create Program
                    </button>
                    <button
                        onClick={() => router.push("/admin/academy/cohorts/new")}
                        className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                    >
                        Create Cohort
                    </button>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Programs Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900">Programs</h2>
                    {programs.length === 0 ? (
                        <Card>
                            <p className="text-slate-500">No programs found.</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {programs.map((program) => (
                                <Card
                                    key={program.id}
                                    className="flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow relative group"
                                    onClick={() => router.push(`/admin/academy/programs/${program.id}`)}
                                >
                                    <div className="flex justify-between">
                                        <h3 className="font-medium text-slate-900">{program.name}</h3>
                                        <span className="text-xs font-medium uppercase text-slate-500">{program.level}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{program.description || "No description"}</p>
                                    <div className="text-xs text-slate-500">{program.duration_weeks} weeks</div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cohorts Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900">Cohorts</h2>
                    {cohorts.length === 0 ? (
                        <Card>
                            <p className="text-slate-500">No cohorts found.</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {cohorts.map((cohort) => (
                                <Card
                                    key={cohort.id}
                                    className="flex flex-col gap-2 cursor-pointer hover:shadow-md transition-shadow relative group"
                                    onClick={() => router.push(`/admin/academy/cohorts/${cohort.id}`)}
                                >
                                    <div className="flex justify-between">
                                        <h3 className="font-medium text-slate-900">{cohort.name}</h3>
                                        <span className={`text-xs font-medium uppercase ${cohort.status === 'active' ? 'text-green-600' : 'text-slate-500'
                                            }`}>
                                            {cohort.status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Starts: {new Date(cohort.start_date).toLocaleDateString()}</span>
                                        <span>Ends: {new Date(cohort.end_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs text-slate-500">Capacity: {cohort.capacity}</div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
