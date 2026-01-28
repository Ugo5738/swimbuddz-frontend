"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MilestoneClaimModal } from "@/components/academy/MilestoneClaimModal";
import {
    AcademyApi,
    Enrollment,
    Milestone,
    PaymentStatus,
    StudentProgress,
} from "@/lib/academy";
import { apiPost } from "@/lib/api";
import { Session, SessionsApi } from "@/lib/sessions";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EnrollmentDetailPage() {
    const params = useParams();
    const enrollmentId = params.id as string;

    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [progress, setProgress] = useState<StudentProgress[]>([]);
    const [cohortSessions, setCohortSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

    useEffect(() => {
        if (enrollmentId) {
            loadData();
        }
    }, [enrollmentId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const enrollmentData = await AcademyApi.getEnrollment(enrollmentId);
            setEnrollment(enrollmentData);

            // Load milestones, progress, and cohort sessions
            const programId =
                enrollmentData.cohort?.program_id || enrollmentData.program_id;
            const cohortId = enrollmentData.cohort_id;

            const promises: Promise<any>[] = [];
            if (programId) {
                promises.push(
                    AcademyApi.listMilestones(programId),
                    AcademyApi.getStudentProgress(enrollmentId)
                );
            }
            if (cohortId) {
                promises.push(SessionsApi.getCohortSessions(cohortId));
            }

            const results = await Promise.all(promises);
            let idx = 0;
            if (programId) {
                setMilestones(results[idx++]);
                setProgress(results[idx++]);
            }
            if (cohortId && results[idx]) {
                // Filter to future sessions only
                const now = new Date();
                const futureSessions = (results[idx] as Session[]).filter(
                    (s) => new Date(s.starts_at) > now
                );
                setCohortSessions(futureSessions);
            }
        } catch (error) {
            console.error("Failed to load enrollment:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyPayment = async () => {
        if (!enrollment?.payment_reference) {
            toast.error("No payment reference found");
            return;
        }

        setVerifying(true);
        try {
            await apiPost(
                `/api/v1/payments/verify/${enrollment.payment_reference}`,
                {},
                { auth: true }
            );
            toast.success("Payment verified!");
            await loadData();
        } catch (error) {
            toast.error("Payment not found or still processing. Try again later.");
        } finally {
            setVerifying(false);
        }
    };

    const handleOpenClaimModal = (milestone: Milestone) => {
        setSelectedMilestone(milestone);
    };

    const handleCloseClaimModal = () => {
        setSelectedMilestone(null);
    };

    const handleClaimSuccess = () => {
        loadData();
    };

    if (loading) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="text-lg font-medium text-slate-600">Loading enrollment...</p>
            </div>
        );
    }

    if (!enrollment) {
        return (
            <Card className="p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                    Enrollment not found
                </h2>
                <Link
                    href="/account/academy"
                    className="text-cyan-600 hover:text-cyan-700 mt-4 inline-block"
                >
                    ← Back to My Academy
                </Link>
            </Card>
        );
    }

    const cohort = enrollment.cohort;
    const program = enrollment.program || cohort?.program;
    const isPaid = enrollment.payment_status === PaymentStatus.PAID;
    const isPending = enrollment.payment_status === PaymentStatus.PENDING;

    // Calculate progress
    const achievedCount = progress.filter((p) => p.status === "achieved").length;
    const progressPercent =
        milestones.length > 0
            ? Math.round((achievedCount / milestones.length) * 100)
            : 0;

    return (
        <div className="space-y-8">
            {/* Breadcrumb */}
            <Link
                href="/account/academy"
                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
                ← Back to My Academy
            </Link>

            {/* Header */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge
                                    className={
                                        isPaid
                                            ? "bg-green-500 text-white"
                                            : "bg-yellow-500 text-white"
                                    }
                                >
                                    {isPaid ? "✓ Active" : "Payment Pending"}
                                </Badge>
                            </div>
                            <h1 className="text-2xl font-bold">
                                {program?.name || "Academy Program"}
                            </h1>
                            <p className="text-cyan-100">
                                {cohort?.name || "No cohort assigned"}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold">{progressPercent}%</div>
                            <div className="text-cyan-100">Complete</div>
                        </div>
                    </div>
                </div>

                {/* Payment Pending Alert */}
                {isPending && (
                    <div className="p-4 bg-yellow-50 border-b border-yellow-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-medium text-yellow-800">
                                    Payment is being processed
                                </p>
                                <p className="text-sm text-yellow-700">
                                    If you&apos;ve already paid, your status will update
                                    shortly. Taking too long?
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleVerifyPayment}
                                disabled={verifying}
                            >
                                {verifying ? "Verifying..." : "Verify Payment"}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Progress Bar */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-slate-900">
                                Overall Progress
                            </h2>
                            <span className="text-sm text-slate-600">
                                {achievedCount} of {milestones.length} milestones
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </Card>

                    {/* Milestones */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Milestones
                        </h2>
                        {milestones.length === 0 ? (
                            <p className="text-slate-500 text-center py-6">
                                No milestones defined for this program yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {milestones.map((milestone) => {
                                    const milestoneProgress = progress.find(
                                        (p) => p.milestone_id === milestone.id
                                    );
                                    const isAchieved =
                                        milestoneProgress?.status === "achieved";
                                    const isVerified = !!milestoneProgress?.reviewed_at;

                                    return (
                                        <div
                                            key={milestone.id}
                                            className={`flex items-start gap-4 rounded-lg border-2 p-4 transition-all ${isAchieved
                                                ? isVerified
                                                    ? "border-green-300 bg-green-50"
                                                    : "border-amber-200 bg-amber-50"
                                                : "border-slate-200 bg-white"
                                                }`}
                                        >
                                            <div className="flex-shrink-0 mt-0.5">
                                                {isVerified ? (
                                                    <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M5 13l4 4L19 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                ) : isAchieved ? (
                                                    <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                                                        <svg
                                                            className="h-4 w-4 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-slate-300" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4
                                                        className={`font-medium ${isVerified
                                                            ? "text-green-900"
                                                            : isAchieved
                                                                ? "text-amber-900"
                                                                : "text-slate-900"
                                                            }`}
                                                    >
                                                        {milestone.name}
                                                    </h4>
                                                    {/* Status Badge */}
                                                    {isVerified ? (
                                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                                            ✓ Verified
                                                        </Badge>
                                                    ) : isAchieved ? (
                                                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                                                            Pending Review
                                                        </Badge>
                                                    ) : (
                                                        isPaid && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleOpenClaimModal(milestone)}
                                                                className="text-xs"
                                                            >
                                                                Mark Complete
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                                {milestone.criteria && (
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        {milestone.criteria}
                                                    </p>
                                                )}
                                                {milestone.required_evidence === "video" && !isAchieved && (
                                                    <p className="text-xs text-slate-500 mt-1 italic">
                                                        📹 Video evidence required
                                                    </p>
                                                )}
                                                {milestoneProgress?.student_notes && (
                                                    <div className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-700">
                                                        <span className="font-medium">Your note: </span>
                                                        {milestoneProgress.student_notes}
                                                    </div>
                                                )}
                                                {milestoneProgress?.coach_notes && (
                                                    <div className="mt-2 p-3 bg-white rounded border text-sm">
                                                        <span className="font-medium">
                                                            Coach Note:{" "}
                                                        </span>
                                                        {milestoneProgress.coach_notes}
                                                    </div>
                                                )}
                                                {isVerified &&
                                                    milestoneProgress?.reviewed_at && (
                                                        <p className="text-xs text-green-600 mt-1">
                                                            ✓ Verified{" "}
                                                            {new Date(
                                                                milestoneProgress.reviewed_at
                                                            ).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                {isAchieved && !isVerified &&
                                                    milestoneProgress?.achieved_at && (
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            Claimed{" "}
                                                            {new Date(
                                                                milestoneProgress.achieved_at
                                                            ).toLocaleDateString()}{" "}
                                                            • Awaiting coach verification
                                                        </p>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Upcoming Sessions */}
                    <Card className="p-6">
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            Upcoming Sessions
                        </h2>
                        {cohortSessions.length === 0 ? (
                            <p className="text-slate-500 text-center py-6">
                                No upcoming sessions scheduled for your cohort yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {cohortSessions.slice(0, 5).map((session) => {
                                    const startDate = new Date(session.starts_at);
                                    const endDate = new Date(session.ends_at);
                                    return (
                                        <div
                                            key={session.id}
                                            className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-slate-50"
                                        >
                                            <div className="flex-shrink-0 text-center">
                                                <div className="text-xs text-slate-500 uppercase">
                                                    {startDate.toLocaleDateString("en-NG", { month: "short" })}
                                                </div>
                                                <div className="text-2xl font-bold text-cyan-600">
                                                    {startDate.getDate()}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-medium text-slate-900 truncate">
                                                    {session.title || session.lesson_title || `Week ${session.week_number} Class`}
                                                </h4>
                                                <p className="text-sm text-slate-600">
                                                    {startDate.toLocaleTimeString("en-NG", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })} - {endDate.toLocaleTimeString("en-NG", {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                    {session.location_name && ` • ${session.location_name}`}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {cohortSessions.length > 5 && (
                                    <p className="text-sm text-slate-500 text-center pt-2">
                                        + {cohortSessions.length - 5} more sessions
                                    </p>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Cohort Info */}
                    {cohort && (
                        <Card className="p-6">
                            <h3 className="font-semibold text-slate-900 mb-3">
                                Cohort Details
                            </h3>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Cohort</dt>
                                    <dd className="font-medium text-slate-900">
                                        {cohort.name}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Starts</dt>
                                    <dd className="font-medium text-slate-900">
                                        {new Date(cohort.start_date).toLocaleDateString()}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-slate-500">Ends</dt>
                                    <dd className="font-medium text-slate-900">
                                        {new Date(cohort.end_date).toLocaleDateString()}
                                    </dd>
                                </div>
                                {cohort.location_name && (
                                    <div className="flex justify-between">
                                        <dt className="text-slate-500">Location</dt>
                                        <dd className="font-medium text-slate-900">
                                            {cohort.location_name}
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </Card>
                    )}

                    {/* Certificate Section - Show when 100% complete */}
                    {progressPercent === 100 && (
                        <Card className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                            <div className="text-center">
                                <div className="text-4xl mb-2">🎓</div>
                                <h3 className="font-semibold text-slate-900 mb-2">
                                    Congratulations!
                                </h3>
                                <p className="text-sm text-slate-600 mb-4">
                                    You&apos;ve completed all milestones! Your certificate is ready.
                                </p>
                                <Button
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                    onClick={() => {
                                        window.open(
                                            `/api/v1/academy/enrollments/${enrollmentId}/certificate.pdf`,
                                            "_blank"
                                        );
                                    }}
                                >
                                    📄 Download Certificate
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Quick Links */}
                    <Card className="p-6">
                        <h3 className="font-semibold text-slate-900 mb-3">
                            Quick Links
                        </h3>
                        <div className="space-y-2">
                            {cohort && (
                                <Link
                                    href={`/account/academy/cohorts/${cohort.id}`}
                                    className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <span className="text-sm font-medium text-slate-900">
                                        View Cohort Details
                                    </span>
                                </Link>
                            )}
                            <Link
                                href="/account/sessions"
                                className="block p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <span className="text-sm font-medium text-slate-900">
                                    View Upcoming Sessions
                                </span>
                            </Link>
                        </div>
                    </Card>

                    {/* Need Help */}
                    <Card className="p-6 bg-cyan-50 border-cyan-100">
                        <h3 className="font-semibold text-slate-900 mb-2">
                            Need Help?
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Questions about your program or sessions? Reach out to
                            our team.
                        </p>
                        <Button variant="outline" className="w-full">
                            Contact Support
                        </Button>
                    </Card>
                </div>
            </div>

            {/* Milestone Claim Modal */}
            {selectedMilestone && (
                <MilestoneClaimModal
                    isOpen={!!selectedMilestone}
                    onClose={handleCloseClaimModal}
                    milestone={selectedMilestone}
                    enrollmentId={enrollmentId}
                    onSuccess={handleClaimSuccess}
                />
            )}
        </div>
    );
}
