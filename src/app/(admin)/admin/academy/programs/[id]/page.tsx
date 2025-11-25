"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Program, Milestone } from "@/lib/academy";

export default function ProgramDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [programData, milestonesData] = await Promise.all([
                    AcademyApi.getProgram(id),
                    AcademyApi.listMilestones(id)
                ]);
                setProgram(programData);
                setMilestones(milestonesData);
            } catch (error) {
                console.error("Failed to load program details", error);
                toast.error("Failed to load program details");
            } finally {
                setLoading(false);
            }
        }
        if (id) {
            loadData();
        }
    }, [id]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this program? This action cannot be undone.")) return;
        try {
            await AcademyApi.deleteProgram(id);
            toast.success("Program deleted");
            router.push("/admin/academy");
        } catch (error) {
            console.error("Failed to delete program", error);
            toast.error("Failed to delete program");
        }
    };

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!program) {
        return <div className="p-6">Program not found</div>;
    }

    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <button onClick={() => router.push("/admin/academy")} className="hover:text-slate-900">
                            Academy
                        </button>
                        <span>/</span>
                        <span>Programs</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">{program.name}</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => toast.info("Edit feature coming soon")} // Placeholder for Edit
                        className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                    >
                        Edit
                    </button>
                    <button
                        onClick={handleDelete}
                        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm font-medium text-slate-500">Level</dt>
                                <dd className="mt-1 text-sm text-slate-900 uppercase">{program.level}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-slate-500">Duration</dt>
                                <dd className="mt-1 text-sm text-slate-900">{program.duration_weeks} weeks</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-slate-500">Description</dt>
                                <dd className="mt-1 text-sm text-slate-900">{program.description || "No description provided."}</dd>
                            </div>
                        </dl>
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">Milestones</h2>
                            <button
                                onClick={() => toast.info("Add Milestone feature coming soon")}
                                className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
                            >
                                + Add Milestone
                            </button>
                        </div>
                        {milestones.length === 0 ? (
                            <p className="text-slate-500 text-sm">No milestones defined for this program.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {milestones.map((milestone) => (
                                    <li key={milestone.id} className="py-3 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{milestone.name}</p>
                                            {milestone.criteria && (
                                                <p className="text-xs text-slate-500">{milestone.criteria}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                {/* Sidebar / Stats (Placeholder) */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Curriculum</h2>
                        <pre className="text-xs bg-slate-50 p-2 rounded overflow-auto max-h-60">
                            {JSON.stringify(program.curriculum_json, null, 2)}
                        </pre>
                    </Card>
                </div>
            </div>
        </div>
    );
}
