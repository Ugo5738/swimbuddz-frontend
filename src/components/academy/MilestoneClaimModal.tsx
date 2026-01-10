"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AcademyApi, Milestone, MilestoneClaimRequest } from "@/lib/academy";
import { MediaInput } from "@/components/ui/MediaInput";

interface MilestoneClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    milestone: Milestone;
    enrollmentId: string;
    onSuccess: () => void;
}

export function MilestoneClaimModal({
    isOpen,
    onClose,
    milestone,
    enrollmentId,
    onSuccess,
}: MilestoneClaimModalProps) {
    const [evidenceMediaId, setEvidenceMediaId] = useState<string | null>(null);
    const [studentNotes, setStudentNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const claimData: MilestoneClaimRequest = {};
            if (evidenceMediaId) {
                claimData.evidence_media_id = evidenceMediaId;
            }
            if (studentNotes.trim()) {
                claimData.student_notes = studentNotes.trim();
            }

            await AcademyApi.claimMilestone(enrollmentId, milestone.id, claimData);
            toast.success("Milestone claimed! Awaiting coach verification.");

            // Reset form
            setEvidenceMediaId(null);
            setStudentNotes("");

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to claim milestone:", error);
            toast.error("Failed to claim milestone. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setEvidenceMediaId(null);
            setStudentNotes("");
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={handleClose}
        >
            <div
                className="w-full max-w-lg mx-4 rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                    Claim Milestone
                </h2>

                {/* Milestone Info */}
                <div className="mb-6 p-4 bg-cyan-50 rounded-lg border border-cyan-100">
                    <h3 className="font-semibold text-cyan-900">{milestone.name}</h3>
                    {milestone.criteria && (
                        <p className="mt-1 text-sm text-cyan-700">{milestone.criteria}</p>
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

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Evidence Upload */}
                    <div>
                        <MediaInput
                            purpose="milestone_evidence"
                            mode="both"
                            value={evidenceMediaId}
                            onChange={(mediaId) => setEvidenceMediaId(mediaId)}
                            label="Evidence (Video or Image)"
                            showPreview={true}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Upload a video showing your achievement, or paste a YouTube/link URL
                        </p>
                    </div>

                    {/* Student Notes */}
                    <div>
                        <label htmlFor="studentNotes" className="block text-sm font-medium text-slate-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="studentNotes"
                            value={studentNotes}
                            onChange={(e) => setStudentNotes(e.target.value)}
                            rows={3}
                            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="Add any notes for your coach..."
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 rounded border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Claim"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
