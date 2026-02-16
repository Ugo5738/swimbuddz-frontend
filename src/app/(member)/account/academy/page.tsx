"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AcademyApi, Cohort, Enrollment, EnrollmentStatus, Milestone, PaymentStatus, Program, StudentProgress } from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type EnrollmentWithDetails = Enrollment & {
    cohort?: Cohort;
    program?: Program;
    progress?: StudentProgress[];
    milestones?: Milestone[];
    waitlistPosition?: number | null;
};

type CohortEnrollmentStats = {
    cohort_id: string;
    capacity: number;
    enrolled_count: number;
    waitlist_count: number;
    spots_remaining: number;
    is_at_capacity: boolean;
};

type CohortWithProgram = Cohort & {
    program?: Program;
    enrollmentStats?: CohortEnrollmentStats;
};

export default function StudentAcademyPage() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [openCohorts, setOpenCohorts] = useState<CohortWithProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrollingId, setEnrollingId] = useState<string | null>(null);
    const [verifyingId, setVerifyingId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    // Check if we just returned from Paystack (reference in URL)
    const returnedFromPaystack = searchParams.get("reference") || searchParams.get("trxref");
    const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
    const [showVerifyHint, setShowVerifyHint] = useState(false);

    const handleVerifyPayment = async (paymentReference: string, enrollmentId?: string) => {
        setVerifyingId(enrollmentId || paymentReference);
        try {
            await apiPost(`/api/v1/payments/verify/${paymentReference}`, {}, { auth: true });
            toast.success("Payment verified successfully!");
            await loadData();
        } catch (error: unknown) {
            const err = error as { status?: number };
            if (err.status === 404) {
                toast.error("Payment not found. Please check the reference and try again.");
            } else {
                toast.error("Payment still processing. Please try again in a few minutes.");
            }
        } finally {
            setVerifyingId(null);
        }
    };

    const loadData = async () => {
        try {
            const [myEnrollments, availableCohorts] = await Promise.all([
                AcademyApi.getMyEnrollments(),
                AcademyApi.getEnrollableCohorts()
            ]);

            // Filter out cohorts I'm already enrolled in
            const enrolledCohortIds = new Set(myEnrollments.map(e => e.cohort_id));
            const filteredCohorts = availableCohorts.filter(c => !enrolledCohortIds.has(c.id));

            // Fetch program details and enrollment stats for open cohorts
            const cohortsWithPrograms = await Promise.all(
                filteredCohorts.map(async (cohort) => {
                    const [program, enrollmentStats] = await Promise.all([
                        AcademyApi.getProgram(cohort.program_id),
                        apiGet<CohortEnrollmentStats>(
                            `/api/v1/academy/cohorts/${cohort.id}/enrollment-stats`,
                            { auth: true }
                        ).catch(() => null)
                    ]);
                    return { ...cohort, program, enrollmentStats: enrollmentStats || undefined };
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

                    // Fetch waitlist position if on waitlist
                    let waitlistPosition: number | null = null;
                    if (enrollment.status === EnrollmentStatus.WAITLIST) {
                        try {
                            const positionData = await apiGet<{ position: number | null }>(
                                `/api/v1/academy/my-enrollments/${enrollment.id}/waitlist-position`,
                                { auth: true }
                            );
                            waitlistPosition = positionData.position;
                        } catch {
                            // Ignore errors fetching waitlist position
                        }
                    }

                    return {
                        ...enrollment,
                        cohort,
                        program,
                        progress,
                        milestones,
                        waitlistPosition
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

    // Auto-verify payment when returning from Paystack
    useEffect(() => {
        if (returnedFromPaystack && !autoVerifyAttempted && !loading) {
            setAutoVerifyAttempted(true);
            // Give it a moment for webhook to process first
            const timer = setTimeout(async () => {
                try {
                    await apiPost(`/api/v1/payments/verify/${returnedFromPaystack}`, {}, { auth: true });
                    toast.success("Payment verified successfully!");
                    await loadData();
                    // Clean URL params
                    window.history.replaceState({}, '', window.location.pathname);
                } catch {
                    // If verification fails, show hint to manually verify after a delay
                    setShowVerifyHint(true);
                    toast.info("Payment is being processed. You can verify it manually below.");
                }
            }, 2000); // Wait 2 seconds for webhook to potentially process
            return () => clearTimeout(timer);
        }
    }, [returnedFromPaystack, autoVerifyAttempted, loading]);

    const handleEnroll = async (cohortId: string, isWaitlist: boolean = false) => {
        setEnrollingId(cohortId);
        try {
            // Step 1: Create enrollment (will be WAITLIST if at capacity)
            const enrollment = await AcademyApi.selfEnroll({ cohort_id: cohortId });

            // If enrollment is waitlisted, don't create payment - just show success
            if (enrollment.status === EnrollmentStatus.WAITLIST || isWaitlist) {
                toast.success("You've been added to the waitlist! We'll notify you when a spot opens.");
                await loadData();
                return;
            }

            // Step 2: Redirect to checkout page where user can apply discount codes before payment
            const params = new URLSearchParams({
                purpose: "academy_cohort",
                cohort_id: cohortId,
                enrollment_id: enrollment.id,
            });
            toast.success("Enrollment created! Proceeding to checkout...");
            window.location.href = `/checkout?${params.toString()}`;
        } catch (error) {
            console.error("Enrollment failed", error);
            toast.error("Failed to enroll. Please try again.");
        } finally {
            setEnrollingId(null);
        }
    };

    const calculateProgress = (enrollment: EnrollmentWithDetails) => {
        if (!enrollment.milestones || enrollment.milestones.length === 0) return 0;
        // Count only reviewed/approved milestones as complete; treat unreviewed claims as pending
        const approved = enrollment.progress?.filter(p => p.status === 'achieved' && p.reviewed_at).length || 0;
        return Math.round((approved / enrollment.milestones.length) * 100);
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
                            const approvedCount = enrollment.progress?.filter(p => p.status === 'achieved' && p.reviewed_at).length || 0;
                            const totalMilestones = enrollment.milestones?.length || 0;
                            const isPaid = enrollment.payment_status === PaymentStatus.PAID;
                            const isPendingPayment = enrollment.payment_status === PaymentStatus.PENDING;
                            const isPendingApproval = enrollment.status === EnrollmentStatus.PENDING_APPROVAL;
                            const isWaitlisted = enrollment.status === EnrollmentStatus.WAITLIST;
                            const showApprovalBanner = isPaid && isPendingApproval;
                            const showPaymentVerifyOption = isPendingPayment && (showVerifyHint || !returnedFromPaystack);

                            return (
                                <Link
                                    key={enrollment.id}
                                    href={`/account/academy/enrollments/${enrollment.id}`}
                                    className="block"
                                >
                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                                        {/* Waitlist Banner */}
                                        {isWaitlisted && (
                                            <div className="bg-purple-50 border-b border-purple-200 px-6 py-3">
                                                <p className="text-purple-800 text-sm flex items-center gap-2">
                                                    <span className="text-lg">📋</span>
                                                    <span>
                                                        <strong>You're on the waitlist!</strong>
                                                        {enrollment.waitlistPosition
                                                            ? ` Position #${enrollment.waitlistPosition}. We'll notify you when a spot opens.`
                                                            : " We'll notify you when a spot opens."}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Pending Approval Banner */}
                                        {showApprovalBanner && (
                                            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
                                                <p className="text-amber-800 text-sm flex items-center gap-2">
                                                    <span className="text-lg">⏳</span>
                                                    <span>
                                                        <strong>Payment received!</strong> Your enrollment is being reviewed by our team.
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                        {/* Pending Payment Banner with Verify Button */}
                                        {showPaymentVerifyOption && enrollment.payment_reference && (
                                            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <p className="text-blue-800 text-sm flex items-center gap-2">
                                                        <span className="text-lg">💳</span>
                                                        <span>
                                                            <strong>Payment pending.</strong> If you've already paid, click verify to confirm.
                                                        </span>
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleVerifyPayment(enrollment.payment_reference!, enrollment.id);
                                                        }}
                                                        disabled={verifyingId === enrollment.id}
                                                        className="shrink-0"
                                                    >
                                                        {verifyingId === enrollment.id ? "Verifying..." : "Verify Payment"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
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
                                                <span className="text-sm text-slate-600">{approvedCount} of {totalMilestones} milestones</span>
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
                                                    const isApproved = milestoneProgress?.status === 'achieved' && milestoneProgress.reviewed_at;
                                                    const isPendingReview = milestoneProgress?.status === 'achieved' && !milestoneProgress.reviewed_at;
                                                    return (
                                                        <div
                                                            key={milestone.id}
                                                            className={`flex items-start gap-4 rounded-lg border-2 p-4 transition-all ${isApproved
                                                                    ? 'border-green-200 bg-green-50'
                                                                    : isPendingReview
                                                                        ? 'border-amber-200 bg-amber-50'
                                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                                }`}
                                                        >
                                                            <div className="flex-shrink-0 mt-1">
                                                                {isApproved ? (
                                                                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                ) : isPendingReview ? (
                                                                    <div className="h-6 w-6 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center text-amber-500 text-xs font-semibold">
                                                                        …
                                                                    </div>
                                                                ) : (
                                                                    <div className="h-6 w-6 rounded-full border-2 border-slate-300" />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className={`font-semibold ${isApproved
                                                                            ? 'text-green-900'
                                                                            : isPendingReview
                                                                                ? 'text-amber-900'
                                                                                : 'text-slate-900'
                                                                        }`}>
                                                                        {milestone.name}
                                                                    </h4>
                                                                    {isApproved && milestoneProgress?.achieved_at && (
                                                                        <span className="flex-shrink-0 text-xs font-medium text-green-600">
                                                                            ✓ {new Date(milestoneProgress.achieved_at).toLocaleDateString()}
                                                                        </span>
                                                                    )}
                                                                    {isPendingReview && (
                                                                        <span className="flex-shrink-0 text-xs font-medium text-amber-600">
                                                                            Pending review
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
                                </Link>
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
                        No cohorts available to join at the moment.
                    </Card>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {openCohorts.map((cohort) => {
                            const stats = cohort.enrollmentStats;
                            const isAtCapacity = stats?.is_at_capacity ?? false;
                            const spotsRemaining = stats?.spots_remaining ?? cohort.capacity;
                            const waitlistCount = stats?.waitlist_count ?? 0;

                            return (
                            <Card key={cohort.id} className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow">
                                {/* Card Header with gradient */}
                                <div className={`p-5 text-white ${isAtCapacity ? 'bg-gradient-to-br from-purple-700 to-purple-900' : 'bg-gradient-to-br from-slate-700 to-slate-900'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        {cohort.program && (
                                            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                                                {formatLevel(cohort.program.level)}
                                            </span>
                                        )}
                                        {isAtCapacity && (
                                            <span className="inline-flex items-center rounded-full bg-amber-400 text-amber-900 px-3 py-1 text-xs font-semibold">
                                                Full
                                            </span>
                                        )}
                                    </div>
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
                                                {cohort.program?.price_amount ? `₦${cohort.program.price_amount.toLocaleString()}` : 'Free'}
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
                                            <span className="text-slate-500">Spots:</span>
                                            <span className={`font-medium ${isAtCapacity ? 'text-red-600' : spotsRemaining <= 3 ? 'text-amber-600' : 'text-slate-900'}`}>
                                                {isAtCapacity
                                                    ? `Full (${waitlistCount} on waitlist)`
                                                    : `${spotsRemaining} of ${cohort.capacity} remaining`}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleEnroll(cohort.id, isAtCapacity)}
                                        disabled={enrollingId === cohort.id}
                                        variant={isAtCapacity ? "secondary" : "primary"}
                                        className="w-full mt-auto"
                                    >
                                        {enrollingId === cohort.id
                                            ? (isAtCapacity ? "Joining waitlist..." : "Enrolling...")
                                            : (isAtCapacity ? "Join Waitlist" : "Enroll Now")}
                                    </Button>
                                </div>
                            </Card>
                        );
                        })}
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
