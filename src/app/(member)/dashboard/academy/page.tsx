"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AcademyApi, Enrollment, Cohort, StudentProgress, Milestone } from "@/lib/academy";

type EnrollmentWithDetails = Enrollment & {
    cohort?: Cohort;
    progress?: StudentProgress[];
    milestones?: Milestone[];
};

export default function StudentAcademyPage() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const myEnrollments = await AcademyApi.getMyEnrollments();

                // Fetch details for each enrollment
                const detailedEnrollments = await Promise.all(
                    myEnrollments.map(async (enrollment) => {
                        const [cohort, progress] = await Promise.all([
                            AcademyApi.getCohort(enrollment.cohort_id),
                            AcademyApi.getStudentProgress(enrollment.id)
                        ]);

                        // Fetch milestones for the program
                        const milestones = await AcademyApi.listMilestones(cohort.program_id);

                        return {
                            ...enrollment,
                            cohort,
                            progress,
                            milestones
                        };
                    })
                );

                setEnrollments(detailedEnrollments);
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
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">My Academy</h1>
                <p className="text-slate-600">Track your progress and enrollments.</p>
            </header>

            {enrollments.length === 0 ? (
                <Card>
                    <p className="text-slate-500">You are not enrolled in any academy programs yet.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {enrollments.map((enrollment) => (
                        <Card key={enrollment.id} className="space-y-4">
                            <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">{enrollment.cohort?.name}</h2>
                                    <p className="text-sm text-slate-600">
                                        {new Date(enrollment.cohort?.start_date || "").toLocaleDateString()} - {new Date(enrollment.cohort?.end_date || "").toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant={enrollment.status === 'enrolled' ? 'success' : 'default'}>
                                        {enrollment.status}
                                    </Badge>
                                    <Badge variant={enrollment.payment_status === 'paid' ? 'success' : 'warning'}>
                                        Payment: {enrollment.payment_status}
                                    </Badge>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <h3 className="mb-3 font-medium text-slate-900">Milestones Progress</h3>
                                <div className="space-y-3">
                                    {enrollment.milestones?.map((milestone) => {
                                        const progress = enrollment.progress?.find(p => p.milestone_id === milestone.id);
                                        const isAchieved = progress?.status === 'achieved';

                                        return (
                                            <div key={milestone.id} className="flex items-start gap-3 rounded-lg border p-3">
                                                <div className={`mt-1 h-5 w-5 rounded-full border-2 ${isAchieved ? 'border-green-500 bg-green-500' : 'border-slate-300'
                                                    }`} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <h4 className={`font-medium ${isAchieved ? 'text-slate-900' : 'text-slate-600'}`}>
                                                            {milestone.name}
                                                        </h4>
                                                        {isAchieved && (
                                                            <span className="text-xs text-green-600">
                                                                Achieved {new Date(progress.achieved_at!).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {milestone.criteria && (
                                                        <p className="text-sm text-slate-500">{milestone.criteria}</p>
                                                    )}
                                                    {progress?.coach_notes && (
                                                        <div className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-600">
                                                            <span className="font-medium">Coach Note:</span> {progress.coach_notes}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
