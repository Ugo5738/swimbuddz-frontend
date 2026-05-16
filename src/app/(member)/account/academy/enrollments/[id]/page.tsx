"use client";

import { MilestoneClaimModal } from "@/components/academy/MilestoneClaimModal";
import {
  WithdrawEnrollmentModal,
  WithdrawLink,
} from "@/components/academy/WithdrawEnrollmentModal";
import { PaymentChoicePanel } from "@/components/payment/PaymentChoicePanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AcademyApi,
  Enrollment,
  EnrollmentInstallment,
  EnrollmentStatus,
  InstallmentStatus,
  Milestone,
  PaymentStatus,
  StudentProgress,
} from "@/lib/academy";
import { apiGet, apiPost } from "@/lib/api";
import { KOBO_PER_NAIRA } from "@/lib/format";
import { Session, SessionsApi } from "@/lib/sessions";
import { X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { InstallmentRow } from "./components";
import { formatNaira } from "./utils";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnrollmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.id as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [cohortSessions, setCohortSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [openPaymentModal, setOpenPaymentModal] = useState<string | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null,
  );
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  useEffect(() => {
    if (enrollmentId) {
      loadData();
    }
  }, [enrollmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const enrollmentData = await AcademyApi.getEnrollment(enrollmentId);
      setEnrollment(enrollmentData);

      // Load milestones, progress, and cohort sessions
      const programId =
        enrollmentData.cohort?.program_id || enrollmentData.program_id;
      const cohortId = enrollmentData.cohort_id;

      const promises: Promise<any>[] = [];
      if (programId) {
        promises.push(
          AcademyApi.listMilestones(programId),
          AcademyApi.getStudentProgress(enrollmentId),
        );
      }
      if (cohortId) {
        promises.push(SessionsApi.getCohortSessions(cohortId));
      }

      const results = await Promise.all(promises);
      let idx = 0;
      if (programId) {
        setMilestones(results[idx++]);
        setProgress(results[idx++]);
      }
      if (cohortId && results[idx]) {
        // Filter to future sessions only
        const now = new Date();
        const futureSessions = (results[idx] as Session[]).filter(
          (s) => new Date(s.starts_at) > now,
        );
        setCohortSessions(futureSessions);
      }
    } catch (error) {
      console.error("Failed to load enrollment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!enrollment?.payment_reference) {
      toast.error("No payment reference found");
      return;
    }

    setVerifying(true);
    try {
      await apiPost(
        `/api/v1/payments/verify/${enrollment.payment_reference}`,
        {},
        { auth: true },
      );
      toast.success("Payment verified!");
      await loadData();
    } catch (error) {
      toast.error("Payment not found or still processing. Try again later.");
    } finally {
      setVerifying(false);
    }
  };

  /** Called by PaymentChoicePanel when the user chooses card/bank payment.
   *  `chosenAmountKobo` defaults to the installment amount; when the member
   *  used the "Pay a different amount" option, it's their chosen value and
   *  gets passed as amount_override_kobo to the payment intent. */
  const handlePayWithCard = (chosenAmountKobo: number) => {
    if (!openPaymentModal) return;
    const inst = installments.find((i) => i.id === openPaymentModal);
    if (!inst) return;
    const params = new URLSearchParams({
      purpose: "academy_cohort",
      enrollment_id: enrollmentId,
    });
    // Only pass the override when it differs from the stipulated amount,
    // so the default flow stays clean.
    if (chosenAmountKobo > inst.amount) {
      params.set("amount_override_kobo", String(chosenAmountKobo));
    }
    router.push(`/checkout?${params.toString()}`);
  };

  const handleOpenClaimModal = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
  };

  const handleCloseClaimModal = () => {
    setSelectedMilestone(null);
  };

  const handleClaimSuccess = () => {
    loadData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">
          Loading enrollment...
        </p>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <Card className="p-12 text-center">
        <h2 className="text-xl font-semibold text-slate-900">
          Enrollment not found
        </h2>
        <Link
          href="/account/academy"
          className="mt-4 inline-block text-cyan-600 hover:text-cyan-700"
        >
          ← Back to My Academy
        </Link>
      </Card>
    );
  }

  const cohort = enrollment.cohort;
  const program = enrollment.program || cohort?.program;
  const isPaid = enrollment.payment_status === PaymentStatus.PAID;
  const isPending = enrollment.payment_status === PaymentStatus.PENDING;
  const isDropoutPending = enrollment.status === EnrollmentStatus.DROPOUT_PENDING;
  const isDropped = enrollment.status === EnrollmentStatus.DROPPED;
  const isSuspended = !!enrollment.access_suspended;

  // Calculate progress
  const achievedCount = progress.filter((p) => p.status === "achieved").length;
  const progressPercent =
    milestones.length > 0
      ? Math.round((achievedCount / milestones.length) * 100)
      : 0;

  // Installment schedule
  const installments: EnrollmentInstallment[] = enrollment.installments ?? [];
  const totalInstallments = enrollment.total_installments ?? installments.length;
  const paidCount = enrollment.paid_installments_count ?? 0;
  const missedCount = enrollment.missed_installments_count ?? 0;
  const hasInstallments = installments.length > 0;

  // Next unpaid installment (for top-up prompt)
  const nextPending = installments.find(
    (i) => i.status === InstallmentStatus.PENDING,
  );
  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Link
        href="/account/academy"
        className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
      >
        ← Back to My Academy
      </Link>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    isSuspended
                      ? "bg-red-500 text-white"
                      : isDropoutPending
                        ? "bg-orange-500 text-white"
                        : isDropped
                          ? "bg-slate-500 text-white"
                          : isPaid
                            ? "bg-green-500 text-white"
                            : "bg-yellow-500 text-white"
                  }
                >
                  {isSuspended
                    ? "⚠ Access Suspended"
                    : isDropoutPending
                      ? "Dropout Pending"
                      : isDropped
                        ? "Dropped"
                        : isPaid
                          ? "✓ Active"
                          : "Payment Pending"}
                </Badge>
                {hasInstallments && (
                  <Badge className="bg-white/20 text-white text-xs">
                    {paidCount}/{totalInstallments} installments paid
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold">
                {program?.name || "Academy Program"}
              </h1>
              <p className="text-cyan-100">
                {cohort?.name || "No cohort assigned"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{progressPercent}%</div>
              <div className="text-cyan-100">Complete</div>
            </div>
          </div>
        </div>

        {/* Access Suspended Alert */}
        {isSuspended && (
          <div className="border-b border-red-200 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-red-800">
                  ⚠️ Your academy access is suspended
                </p>
                <p className="text-sm text-red-700">
                  Pay your overdue installment below to restore access to
                  sessions and materials.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dropout Pending Alert */}
        {isDropoutPending && (
          <div className="border-b border-orange-200 bg-orange-50 p-4">
            <p className="font-medium text-orange-800">
              ⚠️ Your enrollment is under review
            </p>
            <p className="text-sm text-orange-700">
              You have missed {missedCount} installment
              {missedCount !== 1 ? "s" : ""}. An admin is reviewing your
              enrollment. Please contact support if you&apos;d like to continue.
            </p>
          </div>
        )}

        {/* Payment Pending Alert */}
        {isPending && !isSuspended && (
          <div className="border-b border-yellow-200 bg-yellow-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-yellow-800">
                  Payment is being processed
                </p>
                <p className="text-sm text-yellow-700">
                  If you&apos;ve already paid, your status will update shortly.
                  Taking too long?
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyPayment}
                disabled={verifying}
              >
                {verifying ? "Verifying..." : "Verify Payment"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar */}
          <Card className="p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Overall Progress</h2>
              <span className="text-sm text-slate-600">
                {achievedCount} of {milestones.length} milestones
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </Card>

          {/* ── Installment Payment Schedule ── */}
          {hasInstallments && (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">
                  Payment Schedule
                </h2>
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <span className="text-green-600 font-medium">
                    {paidCount} paid
                  </span>
                  {missedCount > 0 && (
                    <span className="text-red-600 font-medium">
                      {missedCount} missed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {installments.map((inst, i) => (
                  <InstallmentRow
                    key={inst.id}
                    installment={inst}
                    index={i}
                    total={totalInstallments}
                    onOpenPayment={(id) => setOpenPaymentModal(id)}
                  />
                ))}
              </div>

              {/* Summary footer */}
              {installments.length > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-500">Total program fee</span>
                  <span className="font-semibold text-slate-900">
                    {formatNaira(
                      installments.reduce((s, i) => s + i.amount, 0),
                    )}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Milestones */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Milestones
            </h2>
            {milestones.length === 0 ? (
              <p className="py-6 text-center text-slate-500">
                No milestones defined for this program yet.
              </p>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone) => {
                  const milestoneProgress = progress.find(
                    (p) => p.milestone_id === milestone.id,
                  );
                  const isAchieved = milestoneProgress?.status === "achieved";
                  const isVerified =
                    isAchieved && !!milestoneProgress?.reviewed_at;
                  const isPendingReview =
                    isAchieved && !milestoneProgress?.reviewed_at;
                  const isRejected =
                    milestoneProgress?.status === "pending" &&
                    !!milestoneProgress?.reviewed_at;

                  return (
                    <div
                      key={milestone.id}
                      className={`flex items-start gap-4 rounded-lg border-2 p-4 transition-all ${isVerified
                          ? "border-green-300 bg-green-50"
                          : isPendingReview
                            ? "border-amber-200 bg-amber-50"
                            : isRejected
                              ? "border-red-200 bg-red-50"
                              : "border-slate-200 bg-white"
                        }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isVerified ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : isPendingReview ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        ) : isRejected ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                            <svg
                              className="h-4 w-4 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-slate-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-medium ${isVerified
                                ? "text-green-900"
                                : isPendingReview
                                  ? "text-amber-900"
                                  : isRejected
                                    ? "text-red-900"
                                    : "text-slate-900"
                              }`}
                          >
                            {milestone.name}
                          </h4>
                          {/* Status Badge */}
                          {isVerified ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              ✓ Verified
                            </Badge>
                          ) : isPendingReview ? (
                            <Badge className="bg-amber-100 text-amber-800 text-xs">
                              Pending Review
                            </Badge>
                          ) : isRejected ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800 text-xs">
                                Needs Resubmission
                              </Badge>
                              {isPaid && !isSuspended && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleOpenClaimModal(milestone)
                                  }
                                  className="text-xs"
                                >
                                  Resubmit
                                </Button>
                              )}
                            </div>
                          ) : (
                            isPaid &&
                            !isSuspended && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenClaimModal(milestone)}
                                className="text-xs"
                              >
                                Mark Complete
                              </Button>
                            )
                          )}
                        </div>
                        {milestone.criteria && (
                          <p className="mt-1 text-sm text-slate-600">
                            {milestone.criteria}
                          </p>
                        )}
                        {milestone.required_evidence === "video" &&
                          !isAchieved && (
                            <p className="mt-1 text-xs italic text-slate-500">
                              📹 Video evidence required
                            </p>
                          )}
                        {milestoneProgress?.student_notes && (
                          <div className="mt-2 rounded bg-slate-100 p-2 text-sm text-slate-700">
                            <span className="font-medium">Your note: </span>
                            {milestoneProgress.student_notes}
                          </div>
                        )}
                        {milestoneProgress?.coach_notes && (
                          <div className="mt-2 rounded border bg-white p-3 text-sm">
                            <span className="font-medium">Coach Note: </span>
                            {milestoneProgress.coach_notes}
                          </div>
                        )}
                        {isVerified && milestoneProgress?.reviewed_at && (
                          <p className="mt-1 text-xs text-green-600">
                            ✓ Verified{" "}
                            {new Date(
                              milestoneProgress.reviewed_at,
                            ).toLocaleDateString()}
                          </p>
                        )}
                        {isPendingReview && milestoneProgress?.achieved_at && (
                          <p className="mt-1 text-xs text-amber-600">
                            Claimed{" "}
                            {new Date(
                              milestoneProgress.achieved_at,
                            ).toLocaleDateString()}{" "}
                            • Awaiting coach verification
                          </p>
                        )}
                        {isRejected && milestoneProgress?.reviewed_at && (
                          <p className="mt-1 text-xs text-red-600">
                            Reviewed{" "}
                            {new Date(
                              milestoneProgress.reviewed_at,
                            ).toLocaleDateString()}{" "}
                            • Please review feedback and resubmit
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Upcoming Sessions */}
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-slate-900">
              Upcoming Sessions
            </h2>
            {isSuspended && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                ⚠️ Session access is suspended until your overdue payment is
                completed.
              </div>
            )}
            {cohortSessions.length === 0 ? (
              <p className="py-6 text-center text-slate-500">
                No upcoming sessions scheduled for your cohort yet.
              </p>
            ) : (
              <div className="space-y-3">
                {cohortSessions.slice(0, 5).map((session) => {
                  const startDate = new Date(session.starts_at);
                  const endDate = new Date(session.ends_at);
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex-shrink-0 text-center">
                        <div className="text-xs uppercase text-slate-500">
                          {startDate.toLocaleDateString("en-NG", {
                            month: "short",
                          })}
                        </div>
                        <div className="text-2xl font-bold text-cyan-600">
                          {startDate.getDate()}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-medium text-slate-900">
                          {session.title ||
                            session.lesson_title ||
                            `Week ${session.week_number} Class`}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {startDate.toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {endDate.toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {session.location_name &&
                            ` • ${session.location_name}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {cohortSessions.length > 5 && (
                  <p className="pt-2 text-center text-sm text-slate-500">
                    + {cohortSessions.length - 5} more sessions
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Next Payment Due Callout — academy cohort fees are real-money only */}
          {nextPending && (
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-slate-700 to-slate-900 p-4 text-white">
                <div className="text-xs font-medium uppercase tracking-wide opacity-80">
                  Next Payment Due
                </div>
                <p className="mt-1 text-2xl font-bold">
                  ₦{(nextPending.amount / KOBO_PER_NAIRA).toLocaleString("en-NG", { maximumFractionDigits: 0 })}
                </p>
                <p className="text-xs mt-0.5 opacity-80">
                  Installment {nextPending.installment_number} · due{" "}
                  {new Date(nextPending.due_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="p-4">
                <Button
                  className="w-full bg-cyan-600 text-white hover:bg-cyan-700"
                  size="sm"
                  onClick={() => setOpenPaymentModal(nextPending.id)}
                >
                  Pay Installment {nextPending.installment_number}
                </Button>
              </div>
            </Card>
          )}

          {/* Cohort Info */}
          {cohort && (
            <Card className="p-6">
              <h3 className="mb-3 font-semibold text-slate-900">
                Cohort Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Cohort</dt>
                  <dd className="font-medium text-slate-900">{cohort.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Starts</dt>
                  <dd className="font-medium text-slate-900">
                    {new Date(cohort.start_date).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ends</dt>
                  <dd className="font-medium text-slate-900">
                    {new Date(cohort.end_date).toLocaleDateString()}
                  </dd>
                </div>
                {cohort.location_name && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Location</dt>
                    <dd className="font-medium text-slate-900">
                      {cohort.location_name}
                    </dd>
                  </div>
                )}
                {hasInstallments && (
                  <>
                    <hr className="border-slate-100" />
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Installments</dt>
                      <dd className="font-medium text-slate-900">
                        {paidCount}/{totalInstallments}
                      </dd>
                    </div>
                    {missedCount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Missed</dt>
                        <dd className="font-medium text-red-600">
                          {missedCount}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
            </Card>
          )}

          {/* Certificate Section - Show when 100% complete */}
          {progressPercent === 100 && (
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6">
              <div className="text-center">
                <div className="mb-2 text-4xl">🎓</div>
                <h3 className="mb-2 font-semibold text-slate-900">
                  Congratulations!
                </h3>
                <p className="mb-4 text-sm text-slate-600">
                  You&apos;ve completed all milestones! Your certificate is
                  ready.
                </p>
                <Button
                  className="w-full bg-amber-500 text-white hover:bg-amber-600"
                  onClick={() => {
                    window.open(
                      `/api/v1/academy/enrollments/${enrollmentId}/certificate.pdf`,
                      "_blank",
                    );
                  }}
                >
                  📄 Download Certificate
                </Button>
              </div>
            </Card>
          )}

          {/* Quick Links */}
          <Card className="p-6">
            <h3 className="mb-3 font-semibold text-slate-900">Quick Links</h3>
            <div className="space-y-2">
              {cohort && (
                <Link
                  href={`/account/academy/cohorts/${cohort.id}`}
                  className="block rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                >
                  <span className="text-sm font-medium text-slate-900">
                    View Cohort Details
                  </span>
                </Link>
              )}
              <Link
                href="/account/sessions"
                className="block rounded-lg bg-slate-50 p-3 transition-colors hover:bg-slate-100"
              >
                <span className="text-sm font-medium text-slate-900">
                  View Upcoming Sessions
                </span>
              </Link>
            </div>
          </Card>

          {/* Need Help */}
          <Card className="border-cyan-100 bg-cyan-50 p-6">
            <h3 className="mb-2 font-semibold text-slate-900">Need Help?</h3>
            <p className="mb-4 text-sm text-slate-600">
              Questions about payments, sessions, or your program? Reach out to
              our team.
            </p>
            <Button variant="outline" className="w-full">
              Contact Support
            </Button>
            {/* Subtle, low-emphasis withdraw entry point. Members rarely need
                this; if they do, the modal walks them through refund + waiver. */}
            {!isDropped && (
              <div className="mt-4 pt-3 border-t border-cyan-100 text-center">
                <WithdrawLink onClick={() => setWithdrawOpen(true)} />
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Milestone Claim Modal */}
      {selectedMilestone && (
        <MilestoneClaimModal
          isOpen={!!selectedMilestone}
          onClose={handleCloseClaimModal}
          milestone={selectedMilestone}
          enrollmentId={enrollmentId}
          onSuccess={handleClaimSuccess}
        />
      )}

      {/* Withdraw Modal */}
      <WithdrawEnrollmentModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        enrollmentId={enrollmentId}
        cohortName={cohort?.name || "your cohort"}
        programName={program?.name}
        onWithdrawn={() => {
          setWithdrawOpen(false);
          router.push("/account/academy");
        }}
      />

      {/* Payment Choice Modal */}
      {openPaymentModal && (() => {
        const activeInstallment = installments.find(
          (i) => i.id === openPaymentModal,
        );
        if (!activeInstallment) return null;
        const idx = installments.findIndex((i) => i.id === openPaymentModal);
        return (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpenPaymentModal(null);
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Pay Installment {idx + 1} of {totalInstallments}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Due{" "}
                    {new Date(activeInstallment.due_at).toLocaleDateString(
                      "en-NG",
                      { weekday: "short", month: "short", day: "numeric" },
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setOpenPaymentModal(null)}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Panel body */}
              <div className="p-5">
                {(() => {
                  // Total remaining balance = sum of all PENDING installments.
                  // Used by the "Pay a different amount" option as the upper
                  // bound a member can apply in one transaction.
                  const remainingKobo = installments
                    .filter((i) => i.status === InstallmentStatus.PENDING)
                    .reduce((s, i) => s + i.amount, 0);
                  return (
                    <PaymentChoicePanel
                      amountKobo={activeInstallment.amount}
                      maxPayableKobo={remainingKobo}
                      enrollmentId={enrollmentId}
                      installmentId={openPaymentModal}
                      onPayWithCard={handlePayWithCard}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
