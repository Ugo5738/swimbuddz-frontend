"use client";

import { Card } from "@/components/ui/Card";
import { EditProgramModal } from "@/components/academy/EditProgramModal";
import { AddMilestoneModal } from "@/components/academy/AddMilestoneModal";
import { AcademyApi, Milestone, Program } from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ProgramDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false);

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
                        onClick={() => setIsEditModalOpen(true)}
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
                                onClick={() => setIsAddMilestoneModalOpen(true)}
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

                {/* Sidebar / Stats */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Curriculum</h2>
                        {!program.curriculum_json || Object.keys(program.curriculum_json).length === 0 ? (
                            <p className="text-sm text-slate-500">No curriculum defined yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {Array.isArray(program.curriculum_json) ? (
                                    // Handle array curriculum
                                    program.curriculum_json.map((item: any, index: number) => (
                                        <div key={index} className="p-3 bg-slate-50 rounded-lg">
                                            <p className="text-sm font-medium text-slate-900">{item}</p>
                                        </div>
                                    ))
                                ) : typeof program.curriculum_json === 'object' ? (
                                    // Handle object curriculum (e.g., weeks)
                                    Object.entries(program.curriculum_json).map(([key, value]: [string, any]) => (
                                        <div key={key} className="p-3 bg-slate-50 rounded-lg">
                                            <p className="text-xs font-semibold text-slate-700 uppercase mb-1">{key}</p>
                                            {typeof value === 'string' ? (
                                                <p className="text-sm text-slate-900">{value}</p>
                                            ) : Array.isArray(value) ? (
                                                <ul className="text-sm text-slate-900 list-disc list-inside space-y-1">
                                                    {value.map((item: any, idx: number) => (
                                                        <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-slate-900">{JSON.stringify(value)}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    // Fallback for primitive types
                                    <p className="text-sm text-slate-900">{String(program.curriculum_json)}</p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {program && (
                <>
                    <EditProgramModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        onSuccess={(updatedProgram) => {
                            setProgram(updatedProgram);
                            toast.success("Program updated successfully");
                        }}
                        program={program}
                    />
                    <AddMilestoneModal
                        isOpen={isAddMilestoneModalOpen}
                        onClose={() => setIsAddMilestoneModalOpen(false)}
                        onSuccess={(newMilestone) => {
                            setMilestones([...milestones, newMilestone]);
                            toast.success("Milestone added successfully");
                        }}
                        programId={program.id}
                    />
                </>
            )}
        </div>
    );
}
