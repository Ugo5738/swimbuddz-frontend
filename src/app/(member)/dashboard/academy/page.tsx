"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AcademyApi, Enrollment, Cohort, StudentProgress, Milestone } from "@/lib/academy";
import { toast } from "sonner";

type EnrollmentWithDetails = Enrollment & {
    cohort?: Cohort;
    progress?: StudentProgress[];
    milestones?: Milestone[];
};

export default function StudentAcademyPage() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [openCohorts, setOpenCohorts] = useState<Cohort[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState<string | null>(null);

    const loadData = async () => {
        try {
            const [myEnrollments, availableCohorts] = await Promise.all([
                AcademyApi.getMyEnrollments(),
                AcademyApi.getOpenCohorts()
            ]);

            // Filter out cohorts I'm already enrolled in
            const enrolledCohortIds = new Set(myEnrollments.map(e => e.cohort_id));
            setOpenCohorts(availableCohorts.filter(c => !enrolledCohortIds.has(c.id)));

            // Fetch details for each enrollment
            const detailedEnrollments = await Promise.all(
                myEnrollments.map(async (enrollment) => {
                    // If cohort is already eager loaded, use it. Otherwise fetch it.
                    // The backend now eager loads it, but let's be safe.
                    const cohort = enrollment.cohort || await AcademyApi.getCohort(enrollment.cohort_id);
                    const progress = await AcademyApi.getStudentProgress(enrollment.id);

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
            toast.error("Failed to load academy data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleEnroll = async (cohortId: string) => {
        setEnrollingId(cohortId);
        try {
            await AcademyApi.selfEnroll(cohortId);
            toast.success("Successfully enrolled!");
            // Refresh data
            await loadData();
        } catch (error) {
            console.error("Enrollment failed", error);
            toast.error("Failed to enroll. Please try again.");
        } finally {
            setEnrollingId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading academy data...</div>;
    }

    return (
        <div className="space-y-8">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">My Academy</h1>
                <p className="text-slate-600">Track your progress and enroll in new programs.</p>
            </header>

            {/* My Enrollments Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">My Enrollments</h2>
                {enrollments.length === 0 ? (
                    <Card className="p-6 text-center text-slate-500">
                        You are not enrolled in any academy programs yet.
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
            </section>

            {/* Available Cohorts Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900">Available Cohorts</h2>
                {openCohorts.length === 0 ? (
                    <Card className="p-6 text-center text-slate-500">
                        No open cohorts available at the moment.
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {openCohorts.map((cohort) => (
                            <Card key={cohort.id} className="flex flex-col justify-between space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">{cohort.name}</h3>
                                    <div className="mt-2 space-y-1 text-sm text-slate-600">
                                        <p>Starts: {new Date(cohort.start_date).toLocaleDateString()}</p>
                                        <p>Ends: {new Date(cohort.end_date).toLocaleDateString()}</p>
                                        <p>Capacity: {cohort.capacity}</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => handleEnroll(cohort.id)}
                                    disabled={enrollingId === cohort.id}
                                    className="w-full"
                                >
                                    {enrollingId === cohort.id ? "Enrolling..." : "Join Now"}
                                </Button>
                            </Card>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
