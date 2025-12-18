"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Cohort, Enrollment, Milestone, Program, StudentProgress } from "@/lib/academy";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EnrollmentWithDetails = Enrollment & {
    cohort?: Cohort;
    program?: Program;
    progress?: StudentProgress[];
    milestones?: Milestone[];
};

type CohortWithProgram = Cohort & {
    program?: Program;
};

export default function StudentAcademyPage() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [openCohorts, setOpenCohorts] = useState<CohortWithProgram[]>([]);
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
            const filteredCohorts = availableCohorts.filter(c => !enrolledCohortIds.has(c.id));

            // Fetch program details for open cohorts
            const cohortsWithPrograms = await Promise.all(
                filteredCohorts.map(async (cohort) => {
                    const program = await AcademyApi.getProgram(cohort.program_id);
                    return { ...cohort, program };
                })
            );
            setOpenCohorts(cohortsWithPrograms);

            // Fetch details for each enrollment
            const detailedEnrollments = await Promise.all(
                myEnrollments.map(async (enrollment) => {
                    const cohort = enrollment.cohort
                        ? enrollment.cohort
                        : enrollment.cohort_id
                            ? await AcademyApi.getCohort(enrollment.cohort_id)
                            : undefined;

                    const programId = cohort?.program_id || enrollment.program_id;
                    const program = programId ? await AcademyApi.getProgram(programId) : undefined;
                    const progress = await AcademyApi.getStudentProgress(enrollment.id);
                    const milestones = programId ? await AcademyApi.listMilestones(programId) : [];

                    return {
                        ...enrollment,
                        cohort,
                        program,
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
            await AcademyApi.selfEnroll({ cohort_id: cohortId });
            toast.success("Successfully enrolled!");
            await loadData();
        } catch (error) {
            console.error("Enrollment failed", error);
            toast.error("Failed to enroll. Please try again.");
        } finally {
            setEnrollingId(null);
        }
    };

    const calculateProgress = (enrollment: EnrollmentWithDetails) => {
        if (!enrollment.milestones || enrollment.milestones.length === 0) return 0;
        const achieved = enrollment.progress?.filter(p => p.status === 'achieved').length || 0;
        return Math.round((achieved / enrollment.milestones.length) * 100);
    };

    const getLevelBadgeColor = (level: string) => {
        const colors: Record<string, string> = {
            'beginner_1': 'bg-green-100 text-green-700',
            'beginner_2': 'bg-blue-100 text-blue-700',
            'intermediate': 'bg-purple-100 text-purple-700',
            'advanced': 'bg-orange-100 text-orange-700',
            'specialty': 'bg-pink-100 text-pink-700',
        };
        return colors[level] || 'bg-slate-100 text-slate-700';
    };

    const formatLevel = (level: string) => {
        return level.replace('_', ' ').split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
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
                        {enrollments.map((enrollment) => {
                            const progress = calculateProgress(enrollment);
                            const achievedCount = enrollment.progress?.filter(p => p.status === 'achieved').length || 0;
                            const totalMilestones = enrollment.milestones?.length || 0;

                            return (
                                <Card key={enrollment.id} className="overflow-hidden">
                                    {/* Header with gradient */}
                                    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-6 text-white">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {enrollment.program && (
                                                        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                                                            {formatLevel(enrollment.program.level)}
                                                        </span>
                                                    )}
                                                    <Badge variant={enrollment.payment_status === 'paid' ? 'success' : 'warning'}>
                                                        {enrollment.payment_status}
                                                    </Badge>
                                                </div>
                                                <h2 className="text-2xl font-bold">{enrollment.program?.name}</h2>
                                                <p className="text-cyan-50 mt-1">
                                                    {enrollment.cohort?.name} • {new Date(enrollment.cohort?.start_date || "").toLocaleDateString()} - {new Date(enrollment.cohort?.end_date || "").toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="text-4xl font-bold">{progress}%</div>
                                                <div className="text-sm text-cyan-50">Complete</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Program Description */}
                                    {enrollment.program?.description && (
                                        <div className="px-6 pt-4 pb-2 border-b">
                                            <p className="text-sm text-slate-600">{enrollment.program.description}</p>
                                        </div>
                                    )}

                                    {/* Progress Overview */}
                                    <div className="px-6 py-4 bg-slate-50 border-b">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                                            <span className="text-sm text-slate-600">{achievedCount} of {totalMilestones} milestones</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Milestones */}
                                    <div className="p-6">
                                        <h3 className="mb-4 font-semibold text-slate-900">Milestones</h3>
                                        <div className="space-y-3">
                                            {enrollment.milestones?.map((milestone) => {
                                                const milestoneProgress = enrollment.progress?.find(p => p.milestone_id === milestone.id);
                                                const isAchieved = milestoneProgress?.status === 'achieved';

                                                return (
                                                    <div key={milestone.id} className={`flex items-start gap-4 rounded-lg border-2 p-4 transition-all ${isAchieved
                                                        ? 'border-green-200 bg-green-50'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}>
                                                        <div className="flex-shrink-0 mt-1">
                                                            {isAchieved ? (
                                                                <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                                                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            ) : (
                                                                <div className="h-6 w-6 rounded-full border-2 border-slate-300" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h4 className={`font-semibold ${isAchieved ? 'text-green-900' : 'text-slate-900'}`}>
                                                                    {milestone.name}
                                                                </h4>
                                                                {isAchieved && milestoneProgress?.achieved_at && (
                                                                    <span className="flex-shrink-0 text-xs font-medium text-green-600">
                                                                        ✓ {new Date(milestoneProgress.achieved_at).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {milestone.criteria && (
                                                                <p className="text-sm text-slate-600 mt-1">{milestone.criteria}</p>
                                                            )}
                                                            {milestoneProgress?.coach_notes && (
                                                                <div className="mt-2 rounded bg-white p-3 text-sm border border-slate-200">
                                                                    <span className="font-medium text-slate-900">Coach Note: </span>
                                                                    <span className="text-slate-600">{milestoneProgress.coach_notes}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
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
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {openCohorts.map((cohort) => (
                            <Card key={cohort.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Card Header with gradient */}
                                <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white">
                                    {cohort.program && (
                                        <div className="mb-2">
                                            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                                                {formatLevel(cohort.program.level)}
                                            </span>
                                        </div>
                                    )}
                                    <h3 className="text-xl font-bold mb-1">{cohort.program?.name || 'Program'}</h3>
                                    <p className="text-sm text-slate-200">{cohort.name}</p>
                                </div>

                                {/* Card Body */}
                                <div className="flex-1 p-5 space-y-4">
                                    {cohort.program?.description && (
                                        <p className="text-sm text-slate-600 line-clamp-3">{cohort.program.description}</p>
                                    )}

                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Duration:</span>
                                            <span className="font-medium text-slate-900">{cohort.program?.duration_weeks} weeks</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Price:</span>
                                            <span className="font-medium text-slate-900">
                                                {cohort.program?.price ? `$${cohort.program.price}` : 'Free'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Starts:</span>
                                            <span className="font-medium text-slate-900">{new Date(cohort.start_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Ends:</span>
                                            <span className="font-medium text-slate-900">{new Date(cohort.end_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-500">Capacity:</span>
                                            <span className="font-medium text-slate-900">{cohort.capacity} students</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleEnroll(cohort.id)}
                                        disabled={enrollingId === cohort.id}
                                        className="w-full mt-auto"
                                    >
                                        {enrollingId === cohort.id ? "Enrolling..." : "Enroll Now"}
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Additional Options */}
            <section className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
                    <h3 className="text-lg font-bold text-purple-900 mb-2">One-on-One Coaching</h3>
                    <p className="text-purple-700 text-sm mb-4">
                        Need personalized attention? Book private sessions with our expert coaches to fast-track your progress.
                    </p>
                    <Button variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-100">
                        Book a Coach (Coming Soon)
                    </Button>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100">
                    <h3 className="text-lg font-bold text-amber-900 mb-2">Skill Clinics</h3>
                    <p className="text-amber-700 text-sm mb-4">
                        Weekend deep-dive sessions focusing on specific techniques like "Perfect Freestyle" or "Flip Turns".
                    </p>
                    <Button variant="outline" className="w-full border-amber-200 text-amber-700 hover:bg-amber-100">
                        View Upcoming Clinics
                    </Button>
                </Card>
            </section>
        </div>
    );
}
