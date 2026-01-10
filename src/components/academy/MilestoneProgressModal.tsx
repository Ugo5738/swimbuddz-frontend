"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AcademyApi, Milestone, StudentProgress, ProgressStatus } from "@/lib/academy";

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
    const [status, setStatus] = useState<ProgressStatus>(
        currentProgress?.status || ProgressStatus.PENDING
    );
    const [coachNotes, setCoachNotes] = useState(currentProgress?.coach_notes || "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Update state when currentProgress changes
    useEffect(() => {
        setStatus(currentProgress?.status || ProgressStatus.PENDING);
        setCoachNotes(currentProgress?.coach_notes || "");
    }, [currentProgress]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const achievedAt = status === ProgressStatus.ACHIEVED ? new Date().toISOString() : undefined;

            await AcademyApi.updateProgress(enrollmentId, milestone.id, {
                status,
                achieved_at: achievedAt,
                coach_notes: coachNotes || undefined,
            });

            toast.success("Progress updated successfully");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to update progress", error);
            toast.error("Failed to update progress");
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
                <h2 className="mb-4 text-xl font-bold text-slate-900">Update Milestone Progress</h2>

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
                        {milestone.video_url && (
                            <a
                                href={milestone.video_url}
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

                {/* Student's Evidence Section */}
                {currentProgress?.status === ProgressStatus.ACHIEVED && !currentProgress?.reviewed_at && (
                    <div className="mb-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-medium text-amber-800 mb-2">
                            📝 Student has claimed this milestone
                        </div>
                        {currentProgress?.student_notes && (
                            <div className="text-sm text-amber-700 mb-2">
                                <span className="font-medium">Student note:</span> {currentProgress.student_notes}
                            </div>
                        )}
                        {currentProgress?.evidence_media_id && (
                            <div className="text-sm">
                                <span className="font-medium text-amber-700">Evidence: </span>
                                <span className="text-cyan-600">
                                    Media uploaded (ID: {currentProgress.evidence_media_id.slice(0, 8)}...)
                                </span>
                            </div>
                        )}
                        <div className="mt-3 flex gap-2">
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsSubmitting(true);
                                    try {
                                        await AcademyApi.updateProgress(enrollmentId, milestone.id, {
                                            status: ProgressStatus.ACHIEVED,
                                            reviewed_at: new Date().toISOString(),
                                            coach_notes: coachNotes || "Verified",
                                        });
                                        toast.success("Milestone verified!");
                                        onSuccess();
                                        onClose();
                                    } catch (error) {
                                        toast.error("Failed to verify");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="flex-1 rounded bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                                ✓ Verify
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsSubmitting(true);
                                    try {
                                        await AcademyApi.updateProgress(enrollmentId, milestone.id, {
                                            status: ProgressStatus.PENDING,
                                            coach_notes: coachNotes || "Re-demo requested",
                                        });
                                        toast.success("Re-demo requested");
                                        onSuccess();
                                        onClose();
                                    } catch (error) {
                                        toast.error("Failed to request re-demo");
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                                disabled={isSubmitting}
                                className="flex-1 rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                ↺ Request Re-demo
                            </button>
                        </div>
                    </div>
                )}

                {/* Already Verified Banner */}
                {currentProgress?.reviewed_at && (
                    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="text-sm font-medium text-green-800">
                            ✓ Verified on {new Date(currentProgress.reviewed_at).toLocaleDateString()}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Status
                        </label>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setStatus(ProgressStatus.ACHIEVED)}
                                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${status === ProgressStatus.ACHIEVED
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <div
                                        className={`h-3 w-3 rounded-full ${status === ProgressStatus.ACHIEVED ? "bg-green-500" : "bg-slate-300"
                                            }`}
                                    />
                                    Achieved
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatus(ProgressStatus.PENDING)}
                                className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${status === ProgressStatus.PENDING
                                    ? "border-slate-500 bg-slate-50 text-slate-700"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <div
                                        className={`h-3 w-3 rounded-full ${status === ProgressStatus.PENDING ? "bg-slate-400" : "bg-slate-300"
                                            }`}
                                    />
                                    Pending
                                </div>
                            </button>
                        </div>
                    </div>

                    {currentProgress?.achieved_at && (
                        <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                            <div className="text-xs font-medium text-green-700">Achieved on</div>
                            <div className="text-sm text-green-900">
                                {new Date(currentProgress.achieved_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="coachNotes" className="block text-sm font-medium text-slate-700 mb-1">
                            Coach Notes
                        </label>
                        <textarea
                            id="coachNotes"
                            value={coachNotes}
                            onChange={(e) => setCoachNotes(e.target.value)}
                            rows={4}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="Add notes about the student's performance, areas for improvement, or encouragement..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
