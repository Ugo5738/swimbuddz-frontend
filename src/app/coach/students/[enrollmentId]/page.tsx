"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Textarea } from "@/components/ui/Textarea";
import { apiGet } from "@/lib/api";
import {
    calculateProgressPercentage,
    getEnrollmentProgress,
    getProgramMilestones,
    updateStudentProgress,
    type Enrollment,
    type Milestone,
    type StudentProgress,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { Check, CheckCircle2, Circle, GraduationCap } from "lucide-react";
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

    const handleProgressUpdate = async (
        milestoneId: string,
        newStatus: "achieved" | "pending",
        notes?: string
    ) => {
        try {
            const updated = await updateStudentProgress(enrollmentId, milestoneId, {
                status: newStatus,
                achieved_at:
                    newStatus === "achieved" ? new Date().toISOString() : undefined,
                coach_notes: notes,
            });

            // Update local state
            setProgress((prev) => {
                const existing = prev.find((p) => p.milestone_id === milestoneId);
                if (existing) {
                    return prev.map((p) =>
                        p.milestone_id === milestoneId ? updated : p
                    );
                }
                return [...prev, updated];
            });
        } catch (err) {
            console.error("Failed to update progress", err);
            alert("Failed to update progress. Please try again.");
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
    const achievedCount = progress.filter((p) => p.status === "achieved").length;

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
                    <Badge
                        variant={enrollment.status === "enrolled" ? "info" : "success"}
                    >
                        {enrollment.status}
                    </Badge>
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
                            {achievedCount} of {milestones.length} milestones achieved
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
                            This program doesn't have any milestones to track yet.
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
                                onUpdate={handleProgressUpdate}
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
    onUpdate,
}: {
    milestone: Milestone;
    index: number;
    progress?: StudentProgress;
    onUpdate: (
        milestoneId: string,
        status: "achieved" | "pending",
        notes?: string
    ) => Promise<void>;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [notes, setNotes] = useState(progress?.coach_notes || "");
    const [saving, setSaving] = useState(false);

    const isAchieved = progress?.status === "achieved";

    const handleToggle = async () => {
        setSaving(true);
        try {
            await onUpdate(
                milestone.id,
                isAchieved ? "pending" : "achieved",
                notes || undefined
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotes = async () => {
        if (!progress) return;
        setSaving(true);
        try {
            await onUpdate(milestone.id, progress.status, notes || undefined);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className={`border rounded-lg transition-all ${
                isAchieved
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
            }`}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    <button
                        onClick={handleToggle}
                        disabled={saving}
                        className={`flex-shrink-0 mt-0.5 transition-colors ${
                            saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                        }`}
                    >
                        {isAchieved ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : (
                            <Circle className="h-6 w-6 text-slate-300 hover:text-slate-400" />
                        )}
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">#{index + 1}</span>
                            <h3
                                className={`font-medium ${
                                    isAchieved ? "text-emerald-900" : "text-slate-900"
                                }`}
                            >
                                {milestone.name}
                            </h3>
                        </div>
                        {milestone.criteria && (
                            <p className="text-sm text-slate-600 mt-1">{milestone.criteria}</p>
                        )}
                        {isAchieved && progress?.achieved_at && (
                            <p className="text-xs text-emerald-600 mt-2">
                                <Check className="h-3 w-3 inline mr-1" />
                                Achieved {formatDate(progress.achieved_at)}
                            </p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? "Hide" : "Notes"}
                    </Button>
                </div>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4">
                    <Textarea
                        label="Coach Notes"
                        hideLabel
                        placeholder="Add notes about this milestone..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                    />
                    {progress?.student_notes && (
                        <div className="mt-3 p-3 bg-slate-100 rounded-lg">
                            <p className="text-xs text-slate-500 mb-1">Student Notes:</p>
                            <p className="text-sm text-slate-700">{progress.student_notes}</p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 mt-3">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleSaveNotes}
                            disabled={saving || notes === (progress?.coach_notes || "")}
                        >
                            {saving ? "Saving..." : "Save Notes"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
