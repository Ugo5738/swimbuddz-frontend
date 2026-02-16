"use client";

import { useMediaUrl } from "@/hooks/useMediaUrl";
import { Milestone, ProgressStatus, StudentProgress } from "@/lib/academy";
import { reviewMilestone } from "@/lib/coach";
import { useState } from "react";
import { toast } from "sonner";

interface MilestoneProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    milestone: Milestone;
    enrollmentId: string;
    studentName: string;
    currentProgress?: StudentProgress;
    onSuccess: () => void;
}

export function MilestoneProgressModal({
    isOpen,
    onClose,
    milestone,
    enrollmentId,
    studentName,
    currentProgress,
    onSuccess,
}: MilestoneProgressModalProps) {
    const [coachNotes, setCoachNotes] = useState(currentProgress?.coach_notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [milestoneVideoUrl] = useMediaUrl(milestone.video_media_id);
    const [evidenceUrl, evidenceLoading] = useMediaUrl(currentProgress?.evidence_media_id);

    if (!isOpen) return null;

    const isPendingReview =
        currentProgress?.status === ProgressStatus.ACHIEVED && !currentProgress?.reviewed_at;
    const isVerified =
        currentProgress?.status === ProgressStatus.ACHIEVED && !!currentProgress?.reviewed_at;
    const isRejected =
        currentProgress?.status === ProgressStatus.PENDING && !!currentProgress?.reviewed_at;

    const handleReview = async (action: "approve" | "reject") => {
        if (!currentProgress?.id) {
            toast.error("No progress record to review");
            return;
        }
        setIsSubmitting(true);
        try {
            await reviewMilestone(currentProgress.id, {
                action,
                coach_notes: coachNotes || undefined,
            });
            toast.success(action === "approve" ? "Milestone verified!" : "Re-demo requested");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(`Failed to ${action} milestone:`, error);
            toast.error(`Failed to ${action} milestone`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
            <div
                className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-4 text-xl font-bold text-slate-900">Review Milestone</h2>

                <div className="mb-4 space-y-2 rounded-lg bg-slate-50 p-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-sm font-medium text-slate-900">{studentName}</div>
                            <div className="text-xs text-slate-500">Student</div>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 pt-2">
                        <div className="font-medium text-slate-900">{milestone.name}</div>
                        {milestone.criteria && (
                            <div className="mt-1 text-sm text-slate-600">{milestone.criteria}</div>
                        )}
                        {milestoneVideoUrl && (
                            <a
                                href={milestoneVideoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center text-xs text-cyan-600 hover:text-cyan-700"
                            >
                                <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                View Reference Video
                            </a>
                        )}
                    </div>
                </div>

                {/* Student's Evidence Section - shown when pending review */}
                {isPendingReview && (
                    <div className="mb-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-medium text-amber-800 mb-2">
                            Student has claimed this milestone
                        </div>
                        {currentProgress?.student_notes && (
                            <div className="text-sm text-amber-700 mb-2">
                                <span className="font-medium">Student note:</span> {currentProgress.student_notes}
                            </div>
                        )}
                        {currentProgress?.evidence_media_id && (
                            <div className="text-sm">
                                <span className="font-medium text-amber-700 block mb-1">Evidence:</span>
                                {evidenceLoading ? (
                                    <span className="text-cyan-600 text-xs">Loading evidence...</span>
                                ) : evidenceUrl ? (
                                    /\.(mp4|mov|webm|ogg|avi)(\?|$)/i.test(evidenceUrl) ||
                                    evidenceUrl.includes("video") ? (
                                        <video
                                            controls
                                            preload="metadata"
                                            className="w-full max-h-48 rounded border border-amber-200"
                                            src={evidenceUrl}
                                        />
                                    ) : (
                                        <a
                                            href={evidenceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={evidenceUrl}
                                                alt="Student evidence"
                                                className="w-full max-h-48 object-contain rounded border border-amber-200"
                                            />
                                        </a>
                                    )
                                ) : (
                                    <span className="text-slate-500 text-xs">Unable to load evidence</span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Already Verified Banner */}
                {isVerified && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="text-sm font-medium text-green-800">
                            Verified on {new Date(currentProgress!.reviewed_at!).toLocaleDateString()}
                        </div>
                        {currentProgress?.coach_notes && (
                            <div className="text-sm text-green-700 mt-1">
                                <span className="font-medium">Your notes:</span> {currentProgress.coach_notes}
                            </div>
                        )}
                    </div>
                )}

                {/* Rejected Banner */}
                {isRejected && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="text-sm font-medium text-red-800">
                            Rejected on {new Date(currentProgress!.reviewed_at!).toLocaleDateString()}
                        </div>
                        {currentProgress?.coach_notes && (
                            <div className="text-sm text-red-700 mt-1">
                                <span className="font-medium">Your feedback:</span> {currentProgress.coach_notes}
                            </div>
                        )}
                        <div className="text-xs text-red-600 mt-2">
                            Awaiting student resubmission
                        </div>
                    </div>
                )}

                {/* Coach Notes + Actions - only for pending review */}
                {isPendingReview && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="coachNotes" className="block text-sm font-medium text-slate-700 mb-1">
                                Coach Notes
                            </label>
                            <textarea
                                id="coachNotes"
                                value={coachNotes}
                                onChange={(e) => setCoachNotes(e.target.value)}
                                rows={3}
                                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                placeholder="Add notes about the student's performance..."
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => handleReview("reject")}
                                disabled={isSubmitting}
                                className="flex-1 rounded bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {isSubmitting ? "..." : "Request Re-demo"}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleReview("approve")}
                                disabled={isSubmitting}
                                className="flex-1 rounded bg-green-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                {isSubmitting ? "..." : "Verify"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Close button for non-actionable states */}
                {!isPendingReview && (
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
