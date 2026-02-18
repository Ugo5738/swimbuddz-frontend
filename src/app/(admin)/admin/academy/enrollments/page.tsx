"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  AcademyApi,
  Enrollment,
  EnrollmentStatus,
  PaymentStatus,
} from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CheckCircle, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminEnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<EnrollmentStatus | "all">(
    "all",
  );
  const [members, setMembers] = useState<Record<string, any>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
      const uniqueMemberIds = Array.from(new Set(data.map((e) => e.member_id)));
      const newMembers: Record<string, any> = { ...members };

      await Promise.all(
        uniqueMemberIds.map(async (id) => {
          if (!newMembers[id]) {
            try {
              const member = await apiGet<any>(`/api/v1/members/${id}`, {
                auth: true,
              });
              newMembers[id] = member;
            } catch (e) {
              console.error("Failed to fetch member", id);
              newMembers[id] = { first_name: "Unknown", last_name: "Member" };
            }
          }
        }),
      );
      setMembers(newMembers);
    } catch (error) {
      console.error("Failed to fetch enrollments", error);
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApprove = async (enrollment: Enrollment) => {
    setApprovingId(enrollment.id);
    try {
      await AcademyApi.updateEnrollment(enrollment.id, {
        status: EnrollmentStatus.ENROLLED,
      });
      toast.success("Enrollment approved!");
      await fetchEnrollments();
    } catch (e) {
      toast.error("Failed to approve enrollment");
    } finally {
      setApprovingId(null);
    }
  };

  const getStatusBadgeVariant = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.ENROLLED:
        return "success";
      case EnrollmentStatus.PENDING_APPROVAL:
        return "warning";
      case EnrollmentStatus.WAITLIST:
        return "info";
      case EnrollmentStatus.GRADUATED:
        return "default";
      case EnrollmentStatus.DROPPED:
        return "danger";
      default:
        return "default";
    }
  };

  const getPaymentBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
        return "success";
      case PaymentStatus.PENDING:
        return "warning";
      case PaymentStatus.FAILED:
        return "danger";
      case PaymentStatus.WAIVED:
        return "info";
      default:
        return "default";
    }
  };

  // Count pending approvals with paid status for the header
  const pendingPaidCount = enrollments.filter(
    (e) =>
      e.status === EnrollmentStatus.PENDING_APPROVAL &&
      e.payment_status === PaymentStatus.PAID,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Enrollment Requests
          </h1>
          {pendingPaidCount > 0 && (
            <p className="text-sm text-amber-600 mt-1">
              {pendingPaidCount} enrollment{pendingPaidCount !== 1 ? "s" : ""}{" "}
              ready for approval
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as EnrollmentStatus | "all")
            }
          >
            <option value="all">All Statuses</option>
            <option value={EnrollmentStatus.PENDING_APPROVAL}>
              Pending Approval
            </option>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Program / Cohort
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {enrollments.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-sm text-slate-500"
                    >
                      No enrollments found.
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enrollment) => {
                    const member = members[enrollment.member_id];
                    const name = member
                      ? `${member.first_name} ${member.last_name}`
                      : "Loading...";
                    const programName =
                      enrollment.program?.name || "Unknown Program";
                    const cohortName =
                      enrollment.cohort?.name ||
                      (enrollment.cohort_id ? "Cohort assigned" : "No cohort");
                    const canQuickApprove =
                      enrollment.status === EnrollmentStatus.PENDING_APPROVAL &&
                      enrollment.payment_status === PaymentStatus.PAID;

                    return (
                      <tr
                        key={enrollment.id}
                        className={canQuickApprove ? "bg-amber-50" : ""}
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {member?.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {programName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {cohortName}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={getStatusBadgeVariant(enrollment.status)}
                          >
                            {enrollment.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={getPaymentBadgeVariant(
                              enrollment.payment_status,
                            )}
                          >
                            {enrollment.payment_status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(enrollment.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canQuickApprove && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleQuickApprove(enrollment)}
                                disabled={approvingId === enrollment.id}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {approvingId === enrollment.id
                                  ? "..."
                                  : "Approve"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                router.push(
                                  `/admin/academy/enrollments/${enrollment.id}`,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
