"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Program, Cohort } from "@/lib/academy";

export default function AdminAcademyPage() {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);

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
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

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
                    {/* TODO: Add Create Modal */}
                    <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
                        Create Program
                    </button>
                    <button className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
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
                                <Card key={program.id} className="flex flex-col gap-2">
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
                                <Card key={cohort.id} className="flex flex-col gap-2">
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
