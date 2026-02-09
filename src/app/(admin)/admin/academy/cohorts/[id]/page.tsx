"use client";

import { EditCohortModal } from "@/components/academy/EditCohortModal";
import { EnrollmentStatusBadge } from "@/components/academy/EnrollmentStatusBadge";
import { MilestoneProgressModal } from "@/components/academy/MilestoneProgressModal";
import { PaymentStatusBadge } from "@/components/academy/PaymentStatusBadge";
import { UpdateEnrollmentModal } from "@/components/academy/UpdateEnrollmentModal";
import { CohortSessionsSection } from "@/components/sessions/CohortSessionsSection";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
    AcademyApi, Cohort,
    Enrollment,
    Milestone,
    ProgressStatus,
    StudentProgress
} from "@/lib/academy";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type MemberBasicInfo = {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
};

export default function CohortDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const cohortId = params.id as string;

    const [cohort, setCohort] = useState<Cohort | null>(null);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [students, setStudents] = useState<Enrollment[]>([]);
    const [studentProgress, setStudentProgress] = useState<Record<string, StudentProgress[]>>({});
    const [memberLookup, setMemberLookup] = useState<Record<string, MemberBasicInfo>>({});
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Milestone Progress Modal State
    const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
    const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
    const [selectedStudentName, setSelectedStudentName] = useState<string>("");
    const [selectedProgress, setSelectedProgress] = useState<StudentProgress | undefined>();

    // Enrollment Update Modal State
    const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
    const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

    const loadData = async () => {
        try {
            // 1. Get Cohort Details
            const cohortData = await AcademyApi.getCohort(cohortId);
            setCohort(cohortData);

            // 2. Get Milestones for the Program
            const milestonesData = await AcademyApi.listMilestones(cohortData.program_id);
            setMilestones(milestonesData);

            // 3. Get Students (enrollments) and hydrate member info via members service
            const studentsData = await AcademyApi.listCohortStudents(cohortId);
            setStudents(studentsData);

            // 4. Get progress for each student
            const progressLookup: Record<string, StudentProgress[]> = {};
            await Promise.all(
                studentsData.map(async (student) => {
                    try {
                        const progress = await AcademyApi.getStudentProgress(student.id);
                        progressLookup[student.id] = progress;
                    } catch (e) {
                        progressLookup[student.id] = [];
                    }
                })
            );
            setStudentProgress(progressLookup);

            const memberIds = Array.from(new Set(studentsData.map((s) => s.member_id)));
            if (memberIds.length) {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                const membersRes = await fetch(`${API_BASE_URL}/api/v1/members/`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                });
                if (membersRes.ok) {
                    const members = await membersRes.json() as MemberBasicInfo[];
                    const lookup = members.reduce<Record<string, MemberBasicInfo>>((acc, m) => {
                        if (memberIds.includes(m.id)) acc[m.id] = m;
                        return acc;
                    }, {});
                    setMemberLookup(lookup);
                }
            }

        } catch (error) {
            console.error("Failed to load cohort details", error);
            toast.error("Failed to load cohort details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cohortId) {
            loadData();
        }
    }, [cohortId]);

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this cohort? This action cannot be undone.")) return;
        try {
            await AcademyApi.deleteCohort(cohortId);
            toast.success("Cohort deleted");
            router.push("/admin/academy");
        } catch (error) {
            console.error("Failed to delete cohort", error);
            toast.error("Failed to delete cohort");
        }
    };

    const handleMilestoneClick = (
        milestone: Milestone,
        enrollmentId: string,
        studentName: string,
        progress?: StudentProgress
    ) => {
        setSelectedMilestone(milestone);
        setSelectedEnrollmentId(enrollmentId);
        setSelectedStudentName(studentName);
        setSelectedProgress(progress);
        setIsMilestoneModalOpen(true);
    };

    const handleEnrollmentClick = (enrollment: Enrollment) => {
        setSelectedEnrollment(enrollment);
        setIsEnrollmentModalOpen(true);
    };

    const calculateCompletion = (student: Enrollment): number => {
        if (milestones.length === 0) return 0;
        const progress = studentProgress[student.id] || [];
        const achieved = progress.filter(p => p.status === ProgressStatus.ACHIEVED).length;
        return Math.round((achieved / milestones.length) * 100);
    };

    const calculateAverageCompletion = (): number => {
        if (students.length === 0) return 0;
        const total = students.reduce((sum, student) => sum + calculateCompletion(student), 0);
        return Math.round(total / students.length);
    };

    const getPendingPaymentsCount = (): number => {
        return students.filter(s => s.payment_status === "pending").length;
    };

    const formatStudentName = (enrollment: Enrollment) => {
        const member = memberLookup[enrollment.member_id];
        if (member?.first_name || member?.last_name) {
            return `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim();
        }
        return member?.email || enrollment.member_id;
    };

    if (loading) {
        return <div className="p-8 text-center">Loading cohort details...</div>;
    }

    if (!cohort) {
        return <div className="p-8 text-center">Cohort not found</div>;
    }

    return (
        <div className="space-y-6 min-w-0 overflow-hidden">
            <header className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <button onClick={() => router.push("/admin/academy")} className="hover:text-slate-900">
                                Academy
                            </button>
                            <span>/</span>
                            <span>Cohorts</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{cohort.name}</h1>
                        <p className="text-slate-600">
                            {new Date(cohort.start_date).toLocaleDateString()} - {new Date(cohort.end_date).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge variant={cohort.status === 'active' ? 'success' : 'default'}>
                            {cohort.status}
                        </Badge>
                        <button
                            onClick={() => router.push(`/admin/academy/cohorts/${cohortId}/score`)}
                            className="rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                        >
                            Complexity Score
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="rounded bg-white px-3 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                        >
                            Edit
                        </button>
                        <button
                            onClick={handleDelete}
                            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </header>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Total Students</p>
                            <p className="text-3xl font-bold text-slate-900">{students.length}</p>
                        </div>
                        <div className="rounded-full bg-cyan-100 p-3">
                            <svg className="h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Average Completion</p>
                            <p className="text-3xl font-bold text-slate-900">{calculateAverageCompletion()}%</p>
                        </div>
                        <div className="rounded-full bg-green-100 p-3">
                            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 min-w-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600">Pending Payments</p>
                            <p className="text-3xl font-bold text-slate-900">{getPendingPaymentsCount()}</p>
                        </div>
                        <div className="rounded-full bg-yellow-100 p-3">
                            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sessions Section */}
            <CohortSessionsSection
                cohortId={cohortId}
                cohortTimezone={cohort.timezone}
                cohortLocationName={cohort.location_name}
            />

            {/* Student Progress Table */}
            <Card className="overflow-hidden !p-0">
                <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">Student Progress</h2>
                    <p className="text-sm text-slate-600">Track and update milestone achievements</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-900">
                            <tr>
                                <th className="p-4 font-semibold">Student</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Payment</th>
                                <th className="p-4 font-semibold">Progress</th>
                                {milestones.map((milestone) => (
                                    <th key={milestone.id} className="p-4 font-semibold min-w-[150px]">
                                        {milestone.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={milestones.length + 4} className="p-8 text-center text-slate-500">
                                        No students enrolled yet.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => {
                                    const completion = calculateCompletion(student);
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/50">
                                            <td className="p-4 font-medium text-slate-900">
                                                {formatStudentName(student)}
                                                <div className="text-xs font-normal text-slate-500">
                                                    {memberLookup[student.member_id]?.email || student.member_id}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => handleEnrollmentClick(student)}>
                                                    <EnrollmentStatusBadge status={student.status} />
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <button onClick={() => handleEnrollmentClick(student)}>
                                                    <PaymentStatusBadge status={student.payment_status} />
                                                </button>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                                                            style={{ width: `${completion}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-600">{completion}%</span>
                                                </div>
                                            </td>
                                            {milestones.map((milestone) => {
                                                // Get actual progress for this milestone
                                                const progress = (studentProgress[student.id] || []).find(
                                                    p => p.milestone_id === milestone.id
                                                );
                                                const isAchieved = progress?.status === ProgressStatus.ACHIEVED;
                                                const isVerified = !!progress?.reviewed_at;

                                                // Determine status label and styling
                                                let statusLabel = 'Pending';
                                                let badgeClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                                                let dotClass = 'bg-slate-400';

                                                if (isVerified) {
                                                    statusLabel = '✓ Verified';
                                                    badgeClass = 'bg-green-100 text-green-700 hover:bg-green-200';
                                                    dotClass = 'bg-green-500';
                                                } else if (isAchieved) {
                                                    statusLabel = 'Claimed';
                                                    badgeClass = 'bg-amber-100 text-amber-700 hover:bg-amber-200';
                                                    dotClass = 'bg-amber-500';
                                                }

                                                return (
                                                    <td key={milestone.id} className="p-4">
                                                        <button
                                                            onClick={() => handleMilestoneClick(
                                                                milestone,
                                                                student.id,
                                                                formatStudentName(student),
                                                                progress
                                                            )}
                                                            className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors ${badgeClass}`}
                                                        >
                                                            <div className={`h-2 w-2 rounded-full ${dotClass}`} />
                                                            {statusLabel}
                                                        </button>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modals */}
            {cohort && (
                <EditCohortModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={(updatedCohort) => {
                        setCohort(updatedCohort);
                        toast.success("Cohort updated successfully");
                    }}
                    cohort={cohort}
                />
            )}

            {selectedMilestone && (
                <MilestoneProgressModal
                    isOpen={isMilestoneModalOpen}
                    onClose={() => setIsMilestoneModalOpen(false)}
                    milestone={selectedMilestone}
                    enrollmentId={selectedEnrollmentId}
                    studentName={selectedStudentName}
                    currentProgress={selectedProgress}
                    onSuccess={loadData}
                />
            )}

            {selectedEnrollment && (
                <UpdateEnrollmentModal
                    isOpen={isEnrollmentModalOpen}
                    onClose={() => setIsEnrollmentModalOpen(false)}
                    enrollment={selectedEnrollment}
                    onSuccess={loadData}
                />
            )}
        </div>
    );
}
