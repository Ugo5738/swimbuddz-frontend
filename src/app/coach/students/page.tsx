"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
    calculateProgressPercentage,
    getMyCoachCohorts,
    getMyCoachStudents,
    getProgramMilestones,
    type Cohort,
    type Enrollment,
    type Milestone,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function CoachStudentsPage() {
    const [students, setStudents] = useState<Enrollment[]>([]);
    const [cohorts, setCohorts] = useState<Cohort[]>([]);
    const [milestonesByProgram, setMilestonesByProgram] = useState<
        Record<string, Milestone[]>
    >({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCohortId, setSelectedCohortId] = useState<string>("all");
    const [progressFilter, setProgressFilter] = useState<string>("all");

    useEffect(() => {
        async function loadData() {
            try {
                const [studentsData, cohortsData] = await Promise.all([
                    getMyCoachStudents(),
                    getMyCoachCohorts(),
                ]);

                setStudents(studentsData);
                setCohorts(cohortsData);

                // Load milestones for each unique program
                const programIds = new Set<string>();
                studentsData.forEach((s) => {
                    if (s.program_id) programIds.add(s.program_id);
                    if (s.cohort?.program_id) programIds.add(s.cohort.program_id);
                });

                const milestonesMap: Record<string, Milestone[]> = {};
                await Promise.all(
                    Array.from(programIds).map(async (programId) => {
                        try {
                            const milestones = await getProgramMilestones(programId);
                            milestonesMap[programId] = milestones;
                        } catch {
                            milestonesMap[programId] = [];
                        }
                    })
                );
                setMilestonesByProgram(milestonesMap);
            } catch (err) {
                console.error("Failed to load students", err);
                setError("Failed to load your students. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    // Filter students based on search, cohort, and progress
    const filteredStudents = useMemo(() => {
        return students.filter((student) => {
            // Search filter
            const nameMatch =
                !searchQuery ||
                student.member_name
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase()) ||
                student.member_email
                    ?.toLowerCase()
                    .includes(searchQuery.toLowerCase());

            // Cohort filter
            const cohortMatch =
                selectedCohortId === "all" ||
                student.cohort_id === selectedCohortId;

            // Progress filter
            if (progressFilter === "all") {
                return nameMatch && cohortMatch;
            }

            const programId = student.cohort?.program_id || student.program_id;
            const milestones = programId ? milestonesByProgram[programId] || [] : [];
            const totalMilestones = milestones.length;
            const progress = student.progress || [];
            const progressPercent = calculateProgressPercentage(
                progress,
                totalMilestones
            );

            if (progressFilter === "not_started" && progressPercent !== 0) {
                return false;
            }
            if (
                progressFilter === "in_progress" &&
                (progressPercent === 0 || progressPercent === 100)
            ) {
                return false;
            }
            if (progressFilter === "completed" && progressPercent !== 100) {
                return false;
            }

            return nameMatch && cohortMatch;
        });
    }, [
        students,
        searchQuery,
        selectedCohortId,
        progressFilter,
        milestonesByProgram,
    ]);

    // Stats
    const stats = useMemo(() => {
        const total = students.length;
        let notStarted = 0;
        let inProgress = 0;
        let completed = 0;

        students.forEach((student) => {
            const programId = student.cohort?.program_id || student.program_id;
            const milestones = programId ? milestonesByProgram[programId] || [] : [];
            const totalMilestones = milestones.length;
            const progress = student.progress || [];
            const progressPercent = calculateProgressPercentage(
                progress,
                totalMilestones
            );

            if (progressPercent === 0) {
                notStarted++;
            } else if (progressPercent === 100) {
                completed++;
            } else {
                inProgress++;
            }
        });

        return { total, notStarted, inProgress, completed };
    }, [students, milestonesByProgram]);

    if (loading) {
        return <LoadingCard text="Loading your students..." />;
    }

    if (error) {
        return (
            <Alert variant="error" title="Error">
                {error}
            </Alert>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header>
                <h1 className="text-3xl font-bold text-slate-900">My Students</h1>
                <p className="text-slate-600 mt-1">
                    View and track progress for all students across your cohorts.
                </p>
            </header>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Total Students</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Not Started</p>
                    <p className="text-2xl font-bold text-slate-900">
                        {stats.notStarted}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">In Progress</p>
                    <p className="text-2xl font-bold text-emerald-600">
                        {stats.inProgress}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-slate-500">Completed</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="sm:w-48">
                        <Select
                            label="Cohort"
                            value={selectedCohortId}
                            onChange={(e) => setSelectedCohortId(e.target.value)}
                        >
                            <option value="all">All Cohorts</option>
                            {cohorts.map((cohort) => (
                                <option key={cohort.id} value={cohort.id}>
                                    {cohort.name || cohort.program?.name || "Unnamed"}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="sm:w-40">
                        <Select
                            label="Progress"
                            value={progressFilter}
                            onChange={(e) => setProgressFilter(e.target.value)}
                        >
                            <option value="all">All</option>
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </Select>
                    </div>
                </div>
            </Card>

            {/* Students List */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-600">
                        Showing {filteredStudents.length} of {students.length} students
                    </p>
                </div>

                {students.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <Users className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">No students yet</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Students will appear here once they enroll in your cohorts.
                        </p>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center">
                        <Search className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                        <p className="text-slate-600 font-medium">No matching students</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Try adjusting your search or filters.
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
                                        Cohort
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
                                {filteredStudents.map((enrollment) => (
                                    <StudentRow
                                        key={enrollment.id}
                                        enrollment={enrollment}
                                        milestones={
                                            milestonesByProgram[
                                                enrollment.cohort?.program_id ||
                                                    enrollment.program_id ||
                                                    ""
                                            ] || []
                                        }
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}

function StudentRow({
    enrollment,
    milestones,
}: {
    enrollment: Enrollment;
    milestones: Milestone[];
}) {
    const progress = enrollment.progress || [];
    const totalMilestones = milestones.length;
    const progressPercent = calculateProgressPercentage(progress, totalMilestones);
    const achievedCount = progress.filter((p) => p.status === "achieved").length;

    const statusVariant =
        enrollment.status === "enrolled"
            ? "info"
            : enrollment.status === "completed"
              ? "success"
              : enrollment.status === "pending_approval"
                ? "warning"
                : "default";

    const cohortName =
        enrollment.cohort?.name ||
        enrollment.cohort?.program?.name ||
        "Unknown Cohort";

    return (
        <tr className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-3 px-4">
                <div>
                    <p className="font-medium text-slate-900">
                        {enrollment.member_name ||
                            `Student ${enrollment.member_id.slice(0, 8)}`}
                    </p>
                    {enrollment.member_email && (
                        <p className="text-sm text-slate-500">{enrollment.member_email}</p>
                    )}
                </div>
            </td>
            <td className="py-3 px-4">
                <Link
                    href={`/coach/cohorts/${enrollment.cohort_id}`}
                    className="text-sm text-cyan-700 hover:underline"
                >
                    {cohortName}
                </Link>
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
                        {totalMilestones > 0
                            ? `${achievedCount}/${totalMilestones}`
                            : "—"}
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
