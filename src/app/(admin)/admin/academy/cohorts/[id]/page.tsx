"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EditCohortModal } from "@/components/academy/EditCohortModal";
import {
    AcademyApi, Cohort,
    EnrollmentWithStudent,
    Milestone,
    ProgressStatus
} from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CohortDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const cohortId = params.id as string;

    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [students, setStudents] = useState<EnrollmentWithStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const loadData = async () => {
        try {
            // 1. Get Cohort Details
            const cohortData = await AcademyApi.getCohort(cohortId);
            setCohort(cohortData);

            // 2. Get Milestones for the Program
            const milestonesData = await AcademyApi.listMilestones(cohortData.program_id);
            setMilestones(milestonesData);

            // 3. Get Students with Progress
            const studentsData = await AcademyApi.listCohortStudents(cohortId);
            setStudents(studentsData);

        } catch (error) {
            console.error("Failed to load cohort details", error);
            toast.error("Failed to load cohort details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cohortId) {
            loadData();
        }
    }, [cohortId]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this cohort? This action cannot be undone.")) return;
        try {
            await AcademyApi.deleteCohort(cohortId);
            toast.success("Cohort deleted");
            router.push("/admin/academy");
        } catch (error) {
            console.error("Failed to delete cohort", error);
            toast.error("Failed to delete cohort");
        }
    };

    const handleProgressUpdate = async (enrollmentId: string, milestoneId: string, currentStatus: ProgressStatus) => {
        const newStatus = currentStatus === ProgressStatus.ACHIEVED
            ? ProgressStatus.PENDING
            : ProgressStatus.ACHIEVED;

        const achievedAt = newStatus === ProgressStatus.ACHIEVED ? new Date().toISOString() : undefined;

        try {
            await AcademyApi.updateProgress(enrollmentId, milestoneId, {
                status: newStatus,
                achieved_at: achievedAt
            });

            toast.success("Progress updated");

            // Optimistic update or reload
            const studentsData = await AcademyApi.listCohortStudents(cohortId);
            setStudents(studentsData);

        } catch (error) {
            console.error("Failed to update progress", error);
            toast.error("Failed to update progress");
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading cohort details...</div>;
    }

    if (!cohort) {
        return <div className="p-8 text-center">Cohort not found</div>;
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
                        <span>Cohorts</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">{cohort.name}</h1>
                    <p className="text-slate-600">
                        {new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant={cohort.status === 'active' ? 'success' : 'default'}>
                        {cohort.status}
                    </Badge>
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
                </div>
            </header>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-900">
                            <tr>
                                <th className="p-4 font-semibold">Student</th>
                                {milestones.map((milestone) => (
                                    <th key={milestone.id} className="p-4 font-semibold min-w-[150px]">
                                        {milestone.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={milestones.length + 1} className="p-8 text-center text-slate-500">
                                        No students enrolled yet.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-50/50">
                                        <td className="p-4 font-medium text-slate-900">
                                            {student.member.first_name} {student.member.last_name}
                                            <div className="text-xs font-normal text-slate-500">{student.member.email}</div>
                                        </td>
                                        {milestones.map((milestone) => {
                                            const progress = student.progress_records.find(p => p.milestone_id === milestone.id);
                                            const isAchieved = progress?.status === ProgressStatus.ACHIEVED;

                                            return (
                                                <td key={milestone.id} className="p-4">
                                                    <button
                                                        onClick={() => handleProgressUpdate(
                                                            student.id,
                                                            milestone.id,
                                                            progress?.status || ProgressStatus.PENDING
                                                        )}
                                                        className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${isAchieved
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                    >
                                                        <div className={`h-2 w-2 rounded-full ${isAchieved ? 'bg-green-500' : 'bg-slate-400'
                                                            }`} />
                                                        {isAchieved ? 'Achieved' : 'Pending'}
                                                    </button>
                                                    {isAchieved && progress?.achieved_at && (
                                                        <div className="mt-1 text-[10px] text-slate-400">
                                                            {new Date(progress.achieved_at).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {cohort && (
                <EditCohortModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={(updatedCohort) => {
                        setCohort(updatedCohort);
                        toast.success("Cohort updated successfully");
                    }}
                    cohort={cohort}
                />
            )}
        </div>
    );
}
