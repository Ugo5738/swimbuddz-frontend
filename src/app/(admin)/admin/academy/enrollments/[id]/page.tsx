"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
  AcademyApi,
  Cohort,
  Enrollment,
  EnrollmentStatus,
  PaymentStatus,
} from "@/lib/academy";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function EnrollmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [member, setMember] = useState<any | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [status, setStatus] = useState<EnrollmentStatus>(
    EnrollmentStatus.PENDING_APPROVAL,
  );
  const [cohortId, setCohortId] = useState<string>("");

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const found = await AcademyApi.getEnrollment(params.id);

      if (found) {
        setEnrollment(found);
        setStatus(found.status);
        setCohortId(found.cohort_id || "");

        // Fetch Member
        try {
          const m = await apiGet<any>(`/api/v1/members/${found.member_id}`, {
            auth: true,
          });
          setMember(m);
        } catch (e) {
          console.error("Member fetch failed", e);
        }

        // Fetch Cohorts for this program
        const programId = found.program_id || found.program?.id;
        if (programId) {
          const c = await AcademyApi.listCohorts(programId);
          setCohorts(c);
        }
      } else {
        setError("Enrollment not found");
      }
    } catch (e) {
      setError("Failed to load data");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setUpdating(true);
    setError(null);
    try {
      await AcademyApi.updateEnrollment(params.id, {
        status,
        cohort_id: cohortId || undefined,
      });
      toast.success("Enrollment updated successfully");
      router.push("/admin/academy/enrollments");
    } catch (e) {
      setError("Failed to update enrollment");
      toast.error("Failed to update enrollment");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickApprove = async () => {
    setUpdating(true);
    try {
      await AcademyApi.updateEnrollment(params.id, {
        status: EnrollmentStatus.ENROLLED,
      });
      toast.success("Enrollment approved!");
      await loadData();
    } catch (e) {
      toast.error("Failed to approve enrollment");
    } finally {
      setUpdating(false);
    }
  };

  const handleQuickReject = async () => {
    if (!confirm("Are you sure you want to drop this enrollment?")) return;
    setUpdating(true);
    try {
      await AcademyApi.updateEnrollment(params.id, {
        status: EnrollmentStatus.DROPPED,
      });
      toast.success("Enrollment dropped");
      await loadData();
    } catch (e) {
      toast.error("Failed to drop enrollment");
    } finally {
      setUpdating(false);
    }
  };

  const handlePromoteFromWaitlist = async () => {
    setUpdating(true);
    try {
      await AcademyApi.updateEnrollment(params.id, {
        status: EnrollmentStatus.PENDING_APPROVAL,
      });
      toast.success("Student moved from waitlist to pending approval");
      await loadData();
    } catch (e) {
      toast.error("Failed to promote from waitlist");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingCard text="Loading enrollment details..." />;
  if (error || !enrollment)
    return (
      <Alert variant="error" title="Error">
        {error || "Not found"}
      </Alert>
    );

  const isPendingApproval =
    enrollment.status === EnrollmentStatus.PENDING_APPROVAL;
  const isWaitlisted = enrollment.status === EnrollmentStatus.WAITLIST;
  const isPaid = enrollment.payment_status === PaymentStatus.PAID;

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/academy/enrollments">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Enrollment Details
            </h1>
            <p className="text-sm text-slate-500">ID: {enrollment.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(enrollment.status)}>
            {enrollment.status.replace("_", " ")}
          </Badge>
          <Badge variant={getPaymentBadgeVariant(enrollment.payment_status)}>
            {enrollment.payment_status}
          </Badge>
        </div>
      </div>

      {/* Quick Actions for Pending Approvals */}
      {isPendingApproval && isPaid && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">Ready for Approval</p>
                <p className="text-sm text-amber-700">
                  Payment has been received. Approve to activate enrollment.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleQuickApprove}
                disabled={updating}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickReject}
                disabled={updating}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Waitlist Action */}
      {isWaitlisted && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">On Waitlist</p>
                <p className="text-sm text-purple-700">
                  Promote to pending approval when a spot opens.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePromoteFromWaitlist}
              disabled={updating}
            >
              Promote to Pending
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Member Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-slate-100">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                Member Details
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Name</p>
                <p className="font-medium text-slate-900">
                  {member
                    ? `${member.first_name} ${member.last_name}`
                    : "Loading..."}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium text-slate-900">
                  {member?.email || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Phone</p>
                <p className="font-medium text-slate-900">
                  {member?.phone || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Member ID</p>
                <p className="font-mono text-sm text-slate-600">
                  {enrollment.member_id}
                </p>
              </div>
            </div>
            {member && (
              <div className="mt-4 pt-4 border-t">
                <Link href={`/admin/members/${enrollment.member_id}`}>
                  <Button variant="outline" size="sm">
                    View Full Profile
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Program & Cohort Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Program & Cohort
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500">Program</p>
                <p className="font-medium text-slate-900">
                  {enrollment.program?.name || "Unknown Program"}
                </p>
                {enrollment.program?.level && (
                  <Badge variant="default" className="mt-1">
                    {enrollment.program.level.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Cohort</p>
                <p className="font-medium text-slate-900">
                  {enrollment.cohort?.name || "No cohort assigned"}
                </p>
                {enrollment.cohort && (
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(enrollment.cohort.start_date)} -{" "}
                    {formatDate(enrollment.cohort.end_date)}
                  </p>
                )}
              </div>
            </div>

            {enrollment.preferences &&
              Object.keys(enrollment.preferences).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-500 mb-2">Preferences</p>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <pre className="text-xs text-slate-600 whitespace-pre-wrap">
                      {JSON.stringify(enrollment.preferences, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
          </Card>

          {/* Update Form */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Update Enrollment
            </h2>
            <div className="space-y-4">
              <Select
                label="Status"
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EnrollmentStatus)}
              >
                <option value={EnrollmentStatus.PENDING_APPROVAL}>
                  Pending Approval
                </option>
                <option value={EnrollmentStatus.ENROLLED}>
                  Enrolled (Active)
                </option>
                <option value={EnrollmentStatus.WAITLIST}>Waitlist</option>
                <option value={EnrollmentStatus.DROPPED}>Dropped</option>
                <option value={EnrollmentStatus.GRADUATED}>Graduated</option>
              </Select>

              <Select
                label="Assign Cohort"
                name="cohort"
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                hint="Assign the student to a specific cohort"
              >
                <option value="">No Cohort Assigned</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatDate(c.start_date)} - Capacity:{" "}
                    {c.capacity})
                  </option>
                ))}
              </Select>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Info */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Payment</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Status</span>
                <Badge
                  variant={getPaymentBadgeVariant(enrollment.payment_status)}
                >
                  {enrollment.payment_status}
                </Badge>
              </div>
              {enrollment.program?.price_amount !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">
                    {enrollment.program.price_amount > 0
                      ? `₦${enrollment.program.price_amount.toLocaleString()}`
                      : "Free"}
                  </span>
                </div>
              )}
              {(enrollment as any).payment_reference && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Reference</span>
                  <span className="font-mono text-xs text-slate-600">
                    {(enrollment as any).payment_reference}
                  </span>
                </div>
              )}
              {(enrollment as any).paid_at && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Paid At</span>
                  <span className="text-sm text-slate-900">
                    {formatDate((enrollment as any).paid_at)}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Timeline
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div className="w-0.5 h-full bg-slate-200" />
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-slate-900">
                    Enrollment Created
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(enrollment.created_at)}
                  </p>
                </div>
              </div>
              {(enrollment as any).enrolled_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="w-0.5 h-full bg-slate-200" />
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-slate-900">
                      Enrolled
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate((enrollment as any).enrolled_at)}
                    </p>
                  </div>
                </div>
              )}
              {(enrollment as any).paid_at && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Payment Received
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate((enrollment as any).paid_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Source Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Enrollment Source
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Source</span>
                <span className="text-slate-900">
                  {(enrollment as any).source || "web"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Updated</span>
                <span className="text-slate-900">
                  {formatDate(enrollment.updated_at)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
