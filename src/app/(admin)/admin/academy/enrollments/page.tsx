"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { AcademyApi, Enrollment, EnrollmentStatus } from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Helper to fetch member details if not included in enrollment (though eager loading helps, member details might be separate)
// Actually, EnrollmentResponse in backend usually includes member_id.
// If we want member NAME, we need to fetch member profile or have the backend include it.
// The backend `list_enrollments` eager loads `program` and `cohort`, but maybe not `member` details from `members_service`?
// The `members_service` is separate.
// So we probably have `member_id` only.
// We need to fetch member names. We can use `apiGet("/api/v1/members/" + member_id)` for each, or a bulk fetch if available.
// For now, let's show Email (if available) or ID. Wait, Member ID is UUID. User needs Name.
// I'll assume we can fetch member details.

export default function AdminEnrollmentsPage() {
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<EnrollmentStatus | "all">("all");
    const [members, setMembers] = useState<Record<string, any>>({}); // Cache member details

    useEffect(() => {
        fetchEnrollments();
    }, [filterStatus]);

    const fetchEnrollments = async () => {
        setLoading(true);
        try {
            const status = filterStatus === "all" ? undefined : filterStatus;
            const data = await AcademyApi.listAllEnrollments(status);
            setEnrollments(data);

            // Fetch member details for these enrollments
            // This is N+1 but for admin page it's okay for now.
            // A better way is a bulk endpoint.
            const uniqueMemberIds = Array.from(new Set(data.map(e => e.member_id)));
            const newMembers: Record<string, any> = { ...members };

            await Promise.all(uniqueMemberIds.map(async (id) => {
                if (!newMembers[id]) {
                    try {
                        const member = await apiGet<any>(`/api/v1/members/${id}`, { auth: true }); // specific member endpoint?
                        // Or we might need an admin endpoint to get ANY member by ID.
                        // /api/v1/members/me is for self.
                        // /api/v1/members/{id} (admin) usually exists.
                        newMembers[id] = member;
                    } catch (e) {
                        console.error("Failed to fetch member", id);
                        newMembers[id] = { first_name: "Unknown", last_name: "Member" };
                    }
                }
            }));
            setMembers(newMembers);

        } catch (error) {
            console.error("Failed to fetch enrollments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (enrollment: Enrollment) => {
        // Approval means setting status to ENROLLED.
        // If it's a Program request (no cohort), we might need to assign a cohort.
        // For now, let's just allow setting status if cohort is present, or prompt to select cohort?
        // Simpler: Just generic update for now, or "Edit" button.
        router.push(`/admin/academy/enrollments/${enrollment.id}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-900">Enrollment Requests</h1>
                <div className="flex gap-2">
                    <select
                        className="rounded border p-2"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as EnrollmentStatus | "all")}
                    >
                        <option value="all">All Statuses</option>
                        <option value={EnrollmentStatus.PENDING_APPROVAL}>Pending Approval</option>
                        <option value={EnrollmentStatus.ENROLLED}>Enrolled</option>
                        <option value={EnrollmentStatus.WAITLIST}>Waitlist</option>
                        <option value={EnrollmentStatus.DROPPED}>Dropped</option>
                        <option value={EnrollmentStatus.GRADUATED}>Graduated</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingCard text="Loading enrollments..." />
            ) : (
                <Card className="overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Member</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Program / Cohort</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {enrollments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-slate-500">
                                        No enrollments found.
                                    </td>
                                </tr>
                            ) : (
                                enrollments.map((enrollment) => {
                                    const member = members[enrollment.member_id];
                                    const name = member ? `${member.first_name} ${member.last_name}` : "Loading...";
                                    const programName = enrollment.program?.name || "Unknown Program";
                                    const cohortName = enrollment.cohort?.name || (enrollment.cohort_id ? "Cohort " + enrollment.cohort_id : "No Cohort Assigned");

                                    return (
                                        <tr key={enrollment.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                {name}
                                                <div className="text-xs text-slate-500">{member?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                <div className="font-medium">{programName}</div>
                                                <div className="text-xs">{cohortName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${enrollment.status === EnrollmentStatus.PENDING_APPROVAL ? "bg-yellow-100 text-yellow-800" :
                                                        enrollment.status === EnrollmentStatus.ENROLLED ? "bg-green-100 text-green-800" :
                                                            "bg-slate-100 text-slate-800"
                                                    }`}>
                                                    {enrollment.status.replace("_", " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(enrollment.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/admin/academy/enrollments/${enrollment.id}`)}
                                                >
                                                    Manage
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </Card>
            )}
        </div>
    );
}
