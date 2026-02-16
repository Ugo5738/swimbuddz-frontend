"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Textarea } from "@/components/ui/Textarea";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { apiGet } from "@/lib/api";
import {
    calculateProgressPercentage,
    getEnrollmentProgress,
    getProgramMilestones,
    reviewMilestone,
    type Enrollment,
    type Milestone,
    type StudentProgress,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { Check, CheckCircle2, Circle, Clock, Expand, GraduationCap, Loader2, Play, X, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoachStudentProgressPage() {
    const params = useParams();
    const enrollmentId = params.enrollmentId as string;

    const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [progress, setProgress] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                // Load enrollment details
                const enrollmentData = await apiGet<Enrollment>(
                    `/api/v1/academy/enrollments/${enrollmentId}`,
                    { auth: true }
                );
                setEnrollment(enrollmentData);

                // Load progress and milestones
                const [progressData, milestonesData] = await Promise.all([
                    getEnrollmentProgress(enrollmentId),
                    enrollmentData.program_id
                        ? getProgramMilestones(enrollmentData.program_id)
                        : Promise.resolve([]),
                ]);

                setProgress(progressData);
                setMilestones(milestonesData);
            } catch (err) {
                console.error("Failed to load student data", err);
                setError("Failed to load student progress. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [enrollmentId]);

    const handleReview = async (
        progressId: string,
        action: "approve" | "reject",
        notes?: string
    ) => {
        try {
            await reviewMilestone(progressId, {
                action,
                coach_notes: notes,
            });

            // Refresh progress data after review
            const updatedProgress = await getEnrollmentProgress(enrollmentId);
            setProgress(updatedProgress);
        } catch (err) {
            console.error("Failed to review milestone", err);
            alert("Failed to review milestone. Please try again.");
        }
    };

    if (loading) {
        return <LoadingCard text="Loading student progress..." />;
    }

    if (error || !enrollment) {
        return (
            <Alert variant="error" title="Error">
                {error || "Enrollment not found"}
            </Alert>
        );
    }

    const progressPercent = calculateProgressPercentage(progress, milestones.length);
    const achievedCount = progress.filter(
        (p) => p.status === "achieved" && p.reviewed_at
    ).length;
    const pendingReviewCount = progress.filter(
        (p) => p.status === "achieved" && !p.reviewed_at
    ).length;

    // Map progress by milestone_id for easy lookup
    const progressByMilestone = progress.reduce(
        (acc, p) => {
            acc[p.milestone_id] = p;
            return acc;
        },
        {} as Record<string, StudentProgress>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <Link
                    href={
                        enrollment.cohort_id
                            ? `/coach/cohorts/${enrollment.cohort_id}`
                            : "/coach/cohorts"
                    }
                    className="text-sm text-slate-500 hover:text-slate-700"
                >
                    ← Back to cohort
                </Link>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mt-2">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">
                            Student Progress
                        </h1>
                        <p className="text-slate-600 mt-1">
                            {enrollment.member_name ||
                                `Student ${enrollment.member_id.slice(0, 8)}`}
                        </p>
                        {enrollment.member_email && (
                            <p className="text-sm text-slate-500">{enrollment.member_email}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingReviewCount > 0 && (
                            <Badge variant="warning">
                                {pendingReviewCount} pending review
                            </Badge>
                        )}
                        <Badge
                            variant={enrollment.status === "enrolled" ? "info" : "success"}
                        >
                            {enrollment.status}
                        </Badge>
                    </div>
                </div>
            </header>

            {/* Progress Summary */}
            <Card className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold text-slate-900 mb-2">
                            Overall Progress
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="text-lg font-semibold text-slate-900">
                                {progressPercent}%
                            </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                            {achievedCount} of {milestones.length} milestones verified
                        </p>
                    </div>
                    <div className="text-center sm:text-right">
                        <p className="text-sm text-slate-500">Enrolled</p>
                        <p className="font-medium text-slate-900">
                            {formatDate(enrollment.created_at)}
                        </p>
                    </div>
                </div>
            </Card>

            {/* Program & Cohort Info */}
            {(enrollment.program || enrollment.cohort) && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {enrollment.program && (
                        <Card className="p-4">
                            <p className="text-sm text-slate-500 mb-1">Program</p>
                            <p className="font-semibold text-slate-900">
                                {enrollment.program.name}
                            </p>
                            {enrollment.program.description && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                                    {enrollment.program.description}
                                </p>
                            )}
                        </Card>
                    )}
                    {enrollment.cohort && (
                        <Card className="p-4">
                            <p className="text-sm text-slate-500 mb-1">Cohort</p>
                            <p className="font-semibold text-slate-900">
                                {enrollment.cohort.name}
                            </p>
                            <p className="text-sm text-slate-600 mt-1">
                                {formatDate(enrollment.cohort.start_date)} -{" "}
                                {formatDate(enrollment.cohort.end_date)}
                            </p>
                        </Card>
                    )}
                </div>
            )}

            {/* Milestones */}
            <Card className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                    Milestones
                </h2>

                {milestones.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <GraduationCap className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">No milestones defined</p>
                        <p className="text-sm text-slate-500 mt-1">
                            This program doesn&apos;t have any milestones to track yet.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {milestones.map((milestone, index) => (
                            <MilestoneItem
                                key={milestone.id}
                                milestone={milestone}
                                index={index}
                                progress={progressByMilestone[milestone.id]}
                                onReview={handleReview}
                            />
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

function MilestoneItem({
    milestone,
    index,
    progress,
    onReview,
}: {
    milestone: Milestone;
    index: number;
    progress?: StudentProgress;
    onReview: (
        progressId: string,
        action: "approve" | "reject",
        notes?: string
    ) => Promise<void>;
}) {
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState(progress?.coach_notes || "");
    const [saving, setSaving] = useState(false);

    const isAchieved = progress?.status === "achieved";
    const isVerified = isAchieved && !!progress?.reviewed_at;
    const isPendingReview = isAchieved && !progress?.reviewed_at;
    const isRejected =
        progress?.status === "pending" && !!progress?.reviewed_at;

    const handleApprove = async () => {
        if (!progress) return;
        setSaving(true);
        try {
            await onReview(progress.id, "approve", notes || undefined);
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!progress) return;
        setSaving(true);
        try {
            await onReview(progress.id, "reject", notes || undefined);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`border rounded-lg transition-all ${
                isVerified
                    ? "border-emerald-200 bg-emerald-50"
                    : isPendingReview
                      ? "border-amber-200 bg-amber-50"
                      : isRejected
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200 bg-white"
            }`}
        >
            {/* Milestone Header */}
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        {isVerified ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : isPendingReview ? (
                            <Clock className="h-6 w-6 text-amber-500" />
                        ) : isRejected ? (
                            <XCircle className="h-6 w-6 text-red-500" />
                        ) : (
                            <Circle className="h-6 w-6 text-slate-300" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">#{index + 1}</span>
                            <h3
                                className={`font-medium ${
                                    isVerified
                                        ? "text-emerald-900"
                                        : isPendingReview
                                          ? "text-amber-900"
                                          : isRejected
                                            ? "text-red-900"
                                            : "text-slate-900"
                                }`}
                            >
                                {milestone.name}
                            </h3>
                            {isVerified && (
                                <Badge variant="success" className="text-xs">
                                    Verified
                                </Badge>
                            )}
                            {isPendingReview && (
                                <Badge variant="warning" className="text-xs">
                                    Pending Review
                                </Badge>
                            )}
                            {isRejected && (
                                <Badge variant="danger" className="text-xs">
                                    Rejected
                                </Badge>
                            )}
                        </div>
                        {milestone.criteria && (
                            <p className="text-sm text-slate-600 mt-1">{milestone.criteria}</p>
                        )}
                        {isVerified && progress?.reviewed_at && (
                            <p className="text-xs text-emerald-600 mt-2">
                                <Check className="h-3 w-3 inline mr-1" />
                                Verified {formatDate(progress.reviewed_at)}
                            </p>
                        )}
                        {isPendingReview && progress?.achieved_at && (
                            <p className="text-xs text-amber-600 mt-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Student claimed {formatDate(progress.achieved_at)}
                            </p>
                        )}
                        {isRejected && progress?.reviewed_at && (
                            <p className="text-xs text-red-600 mt-2">
                                <XCircle className="h-3 w-3 inline mr-1" />
                                Rejected {formatDate(progress.reviewed_at)} — awaiting resubmission
                            </p>
                        )}
                    </div>
                    {/* Details toggle for non-pending states */}
                    {!isPendingReview && (progress?.coach_notes || progress?.student_notes || progress?.evidence_media_id) && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNotes(!showNotes)}
                        >
                            {showNotes ? "Hide" : "Details"}
                        </Button>
                    )}
                </div>
            </div>

            {/* Evidence + Review section — always visible for pending reviews */}
            {isPendingReview && (
                <div className="px-4 pb-4 border-t border-amber-200 pt-4 space-y-3">
                    {/* Student Evidence — prominent */}
                    {progress?.evidence_media_id && (
                        <EvidenceMedia mediaId={progress.evidence_media_id} />
                    )}

                    {/* Student notes */}
                    {progress?.student_notes && (
                        <div className="p-3 bg-white/60 rounded-lg border border-amber-100">
                            <p className="text-xs font-medium text-slate-500 mb-1">Student Notes</p>
                            <p className="text-sm text-slate-700">{progress.student_notes}</p>
                        </div>
                    )}

                    {!progress?.evidence_media_id && !progress?.student_notes && (
                        <p className="text-sm text-amber-600 italic">
                            No evidence or notes submitted with this claim.
                        </p>
                    )}

                    {/* Coach notes input */}
                    <Textarea
                        label="Coach Notes"
                        hideLabel
                        placeholder="Add notes about this milestone (optional)..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                    />

                    {/* Action buttons */}
                    <div className="flex justify-end gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleReject}
                            disabled={saving}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <XCircle className="h-4 w-4 mr-1" />
                            {saving ? "..." : "Reject"}
                        </Button>
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={handleApprove}
                            disabled={saving}
                        >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            {saving ? "..." : "Approve"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Expandable notes section for verified/rejected/not-started */}
            {!isPendingReview && showNotes && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                    {/* Show evidence for verified/rejected too */}
                    {progress?.evidence_media_id && (
                        <EvidenceMedia mediaId={progress.evidence_media_id} />
                    )}

                    {progress?.student_notes && (
                        <div className="mb-3 p-3 bg-slate-100 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Student Notes:</p>
                            <p className="text-sm text-slate-700">{progress.student_notes}</p>
                        </div>
                    )}

                    {progress?.coach_notes ? (
                        <div className={`p-3 rounded-lg ${isVerified ? "bg-emerald-50" : isRejected ? "bg-red-50" : "bg-slate-50"}`}>
                            <p className={`text-xs mb-1 ${isVerified ? "text-emerald-600" : isRejected ? "text-red-600" : "text-slate-500"}`}>
                                {isVerified ? "Coach Notes:" : isRejected ? "Rejection Feedback:" : "Notes:"}
                            </p>
                            <p className="text-sm text-slate-700">{progress.coach_notes}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 italic">No notes.</p>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * In-app media viewer for student evidence.
 * Shows inline preview + click to open full-screen overlay.
 */
function EvidenceMedia({ mediaId }: { mediaId: string }) {
    const [url, isLoading] = useMediaUrl(mediaId);
    const [showFullscreen, setShowFullscreen] = useState(false);

    if (isLoading) {
        return (
            <div className="p-3 bg-cyan-50 rounded-lg flex items-center gap-2 text-sm text-cyan-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading student evidence...
            </div>
        );
    }

    if (!url) {
        return (
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
                Evidence uploaded but could not be loaded.
            </div>
        );
    }

    const isVideo =
        /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(url) || url.includes("video");

    return (
        <>
            <div className="rounded-lg overflow-hidden border border-slate-200">
                <div className="px-3 py-1.5 bg-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Play className="h-3.5 w-3.5 text-slate-600" />
                        <span className="text-xs font-medium text-slate-600">
                            Student Evidence
                        </span>
                    </div>
                    <button
                        onClick={() => setShowFullscreen(true)}
                        className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                    >
                        <Expand className="h-3 w-3" />
                        Full screen
                    </button>
                </div>
                {isVideo ? (
                    <video
                        controls
                        preload="metadata"
                        className="w-full max-h-72"
                        src={url}
                    >
                        Your browser does not support video playback.
                    </video>
                ) : (
                    <button
                        onClick={() => setShowFullscreen(true)}
                        className="w-full cursor-pointer"
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={url}
                            alt="Student milestone evidence"
                            className="w-full max-h-72 object-contain bg-slate-50"
                        />
                    </button>
                )}
            </div>

            {/* Fullscreen in-app overlay */}
            {showFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setShowFullscreen(false)}
                >
                    <button
                        onClick={() => setShowFullscreen(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    <div
                        className="max-w-5xl w-full max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isVideo ? (
                            <video
                                controls
                                autoPlay
                                className="w-full max-h-[90vh] rounded-lg"
                                src={url}
                            >
                                Your browser does not support video playback.
                            </video>
                        ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                                src={url}
                                alt="Student milestone evidence"
                                className="w-full max-h-[90vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
