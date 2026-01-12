"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    calculateProgressPercentage,
    getCohort,
    getCohortStudents,
    getProgramMilestones,
    type Cohort,
    type Enrollment,
    type Milestone,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { Calendar, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CoachCohortDetailPage() {
    const params = useParams();
    const cohortId = params.id as string;

    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [students, setStudents] = useState<Enrollment[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const cohortData = await getCohort(cohortId);
                setCohort(cohortData);

                // Load students and milestones in parallel
                const [studentsData, milestonesData] = await Promise.all([
                    getCohortStudents(cohortId).catch(() => []),
                    cohortData.program_id
                        ? getProgramMilestones(cohortData.program_id).catch(() => [])
                        : Promise.resolve([]),
                ]);

                setStudents(studentsData);
                setMilestones(milestonesData);
            } catch (err) {
                console.error("Failed to load cohort", err);
                setError("Failed to load cohort details. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [cohortId]);

    if (loading) {
        return <LoadingCard text="Loading cohort details..." />;
    }

    if (error || !cohort) {
        return (
            <Alert variant="error" title="Error">
                {error || "Cohort not found"}
            </Alert>
        );
    }

    const statusVariant =
        cohort.status === "active"
            ? "success"
            : cohort.status === "open"
              ? "info"
              : cohort.status === "completed"
                ? "default"
                : "warning";

    const enrolledStudents = students.filter(
        (s) => s.status === "enrolled" || s.status === "completed"
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <Link
                    href="/coach/cohorts"
                    className="text-sm text-slate-500 hover:text-slate-700"
                >
                    ← Back to cohorts
                </Link>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-2">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-900">
                                {cohort.name || "Unnamed Cohort"}
                            </h1>
                            <Badge variant={statusVariant}>
                                {cohort.status.toUpperCase()}
                            </Badge>
                        </div>
                        {cohort.program && (
                            <p className="text-emerald-700 font-medium mt-1">
                                {cohort.program.name}
                            </p>
                        )}
                    </div>
                </div>
            </header>

            {/* Cohort Info */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100">
                        <Calendar className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Duration</p>
                        <p className="font-medium text-slate-900">
                            {formatDate(cohort.start_date)} - {formatDate(cohort.end_date)}
                        </p>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                        <MapPin className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Location</p>
                        <p className="font-medium text-slate-900">
                            {cohort.location_name || "Not specified"}
                        </p>
                    </div>
                </Card>

                <Card className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100">
                        <Users className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500">Enrollment</p>
                        <p className="font-medium text-slate-900">
                            {enrolledStudents.length} / {cohort.capacity} students
                        </p>
                    </div>
                </Card>
            </div>

            {/* Students List */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Students</h2>
                        <p className="text-sm text-slate-600">
                            {enrolledStudents.length} enrolled student
                            {enrolledStudents.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>

                {enrolledStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <Users className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">No students enrolled yet</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Students will appear here once they enroll in this cohort.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                                        Student
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                                        Status
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                                        Progress
                                    </th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">
                                        Enrolled
                                    </th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {enrolledStudents.map((enrollment) => (
                                    <StudentRow
                                        key={enrollment.id}
                                        enrollment={enrollment}
                                        totalMilestones={milestones.length}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Program Milestones */}
            {milestones.length > 0 && (
                <Card className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-4">
                        Program Milestones
                    </h2>
                    <div className="space-y-3">
                        {milestones.map((milestone, index) => (
                            <div
                                key={milestone.id}
                                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                            >
                                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="font-medium text-slate-900">{milestone.name}</p>
                                    {milestone.criteria && (
                                        <p className="text-sm text-slate-600 mt-1">
                                            {milestone.criteria}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

function StudentRow({
    enrollment,
    totalMilestones,
}: {
    enrollment: Enrollment;
    totalMilestones: number;
}) {
    const progress = enrollment.progress || [];
    const progressPercent = calculateProgressPercentage(progress, totalMilestones);
    const achievedCount = progress.filter((p) => p.status === "achieved").length;

    const statusVariant =
        enrollment.status === "enrolled"
            ? "info"
            : enrollment.status === "completed"
              ? "success"
              : "default";

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-3 px-4">
                <div>
                    <p className="font-medium text-slate-900">
                        {enrollment.member_name || `Student ${enrollment.member_id.slice(0, 8)}`}
                    </p>
                    {enrollment.member_email && (
                        <p className="text-sm text-slate-500">{enrollment.member_email}</p>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <Badge variant={statusVariant}>{enrollment.status}</Badge>
            </td>
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[100px]">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-sm text-slate-600">
                        {achievedCount}/{totalMilestones}
                    </span>
                </div>
            </td>
            <td className="py-3 px-4 text-sm text-slate-600">
                {formatDate(enrollment.created_at)}
            </td>
            <td className="py-3 px-4 text-right">
                <Link href={`/coach/students/${enrollment.id}`}>
                    <Button size="sm" variant="outline">
                        View Progress
                    </Button>
                </Link>
            </td>
        </tr>
    );
}
