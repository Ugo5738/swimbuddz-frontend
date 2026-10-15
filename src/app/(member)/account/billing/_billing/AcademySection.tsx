"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { academyBillingCheckoutPath, academyOutstandingKobo, academyTuitionSettled, remainingAcademyInstallments } from "./academyBilling";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Cohort, Enrollment, Member } from "../types";
import { formatCurrency, formatDate } from "../utils";

type Props = {
  myEnrollments: Enrollment[];
  openCohorts: Cohort[];
  communityActive: boolean;
  member: Member | null;
  loading?: boolean;
  unavailable?: boolean;
};

export function AcademySection({ myEnrollments, openCohorts, communityActive, member, loading, unavailable }: Props) {
  const router = useRouter();
  const [selectedCounts, setSelectedCounts] = useState<Record<string, number>>({});
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const goToCheckout = (enrollment: Enrollment, count: number) => {
    const path = academyBillingCheckoutPath(enrollment, count);
    if (!path) return;
    setLoadingCheckout(enrollment.id);
    router.push(path);
  };

  const { paidEnrollments, pendingEnrollments, availableCohorts } = useMemo(() => {
    const paid = myEnrollments.filter((e) => e.status === "enrolled" || e.status === "dropout_pending");
    const pending = myEnrollments.filter(
      (e) => e.status === "pending_approval"
    );
    const enrolledCohortIds = new Set(myEnrollments.map((e) => e.cohort_id));
    const available = openCohorts.filter((c) => !enrolledCohortIds.has(c.id));
    return { paidEnrollments: paid, pendingEnrollments: pending, availableCohorts: available };
  }, [myEnrollments, openCohorts]);

  const academyAccess = member?.membership?.tier_statuses?.academy;
  const academyAccessActive = academyAccess?.status === "active";
  const academyAccessDate =
    academyAccess?.effective_until ||
    academyAccess?.paid_until ||
    member?.membership?.academy_paid_until;

  if (unavailable || (loading && myEnrollments.length === 0)) {
    return <Card className="p-4 text-sm text-slate-600">{unavailable ? "Academy payment information is temporarily unavailable. Use Retry above." : "Loading Academy payment schedules…"}</Card>;
  }

  return (
    <>
      {/* Academy Enrollments Summary */}
      {paidEnrollments.length > 0 && (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-slate-900">
                Academy enrollment
              </h2>
              <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                {paidEnrollments.length} current enrollment
                {paidEnrollments.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-emerald-600 text-sm">
              <svg
                className="h-4 w-4 md:h-5 md:w-5"
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
              <span className="font-medium">Enrollment records</span>
            </div>
          </div>

          <div
            className={`rounded-lg border p-3 text-xs md:p-4 md:text-sm ${
              academyAccessActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">Enrollment</p>
                <p className="mt-0.5 font-semibold">Active</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">
                  Academy access
                </p>
                <p className="mt-0.5 font-semibold">
                  {academyAccessActive
                    ? `Active${academyAccessDate ? ` until ${formatDate(academyAccessDate)}` : ""}`
                    : `${academyAccess?.label || "Expired"}${academyAccessDate ? ` on ${formatDate(academyAccessDate)}` : ""}`}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">Payment</p>
                <p className="mt-0.5 font-semibold">
                  {paidEnrollments.every(academyTuitionSettled)
                    ? "Tuition settled"
                    : paidEnrollments.some((e) => e.installments?.length && !academyTuitionSettled(e))
                      ? "Installments outstanding"
                      : "See enrollment details"}
                </p>
              </div>
            </div>
            {!academyAccessActive && (
              <p className="mt-3 border-t border-amber-200 pt-3 text-amber-800">
                Your enrollment record remains active, but Academy features are locked until your
                access entitlement is restored.
              </p>
            )}
          </div>

          {/* Installment schedule for installment-paying enrollments */}
          {paidEnrollments.some((e) => e.installments && e.installments.length > 0) && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Payment schedule
              </p>
              {paidEnrollments
                .filter((e) => e.installments && e.installments.length > 0)
                .map((e) => {
                  const sorted = [...e.installments!].sort(
                    (a, b) => a.installment_number - b.installment_number
                  );
                  // Unpaid installments are payable only in order (the backend
                  // rolls a payment forward from the earliest unpaid one), so
                  // a member's selection is always a prefix of this list.
                  const unpaid = remainingAcademyInstallments(e);
                  const balanceKobo = academyOutstandingKobo(e);
                  const selectedCount = Math.min(
                    Math.max(selectedCounts[e.id] ?? 1, 1),
                    Math.max(unpaid.length, 1)
                  );
                  const selectedIds = new Set(unpaid.slice(0, selectedCount).map((i) => i.id));
                  const selectedTotalKobo = unpaid
                    .slice(0, selectedCount)
                    .reduce((sum, i) => sum + i.amount, 0);
                  const isPaying = loadingCheckout === e.id;
                  const canPay = academyBillingCheckoutPath(e, 1) !== null;
                  // Checkboxes only make sense when there's a choice to make.
                  const multiSelectable = unpaid.length > 1;

                  return (
                    <div key={e.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">{e.cohort?.name || e.cohort?.program?.name || "Academy cohort"}</h3>
                          <p className="text-xs text-slate-500">{e.status === "dropout_pending" ? "Dropout review — settle outstanding installments to recover" : "Enrollment payment schedule"}</p>
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {balanceKobo === null ? "See details for balance" : `Balance: ${formatCurrency(balanceKobo / 100)}`}
                        </span>
                      </div>
                      {e.price_snapshot_amount != null && (
                        <p className="text-xs text-slate-600">Agreed tuition: {formatCurrency(e.price_snapshot_amount / 100)}
                          {balanceKobo !== null && e.price_snapshot_amount >= balanceKobo
                            ? ` · Settled or waived: ${formatCurrency((e.price_snapshot_amount - balanceKobo) / 100)}`
                            : ""}
                        </p>
                      )}
                      {sorted.map((inst) => {
                        const isPaid = inst.status === "paid";
                        const isMissed = inst.status === "missed";
                        const isUpcoming =
                          !isPaid && !isMissed && new Date(inst.due_at) > new Date();
                        const unpaidIdx = unpaid.findIndex((i) => i.id === inst.id);
                        const isSelectable = multiSelectable && unpaidIdx >= 0;
                        const isSelected = selectedIds.has(inst.id);
                        return (
                          <div
                            key={inst.id}
                            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-800"
                                : isMissed
                                  ? "bg-red-50 text-red-800"
                                  : isUpcoming
                                    ? "bg-slate-50 text-slate-700"
                                    : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {isSelectable ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  aria-label={`Pay installment ${inst.installment_number}`}
                                  onChange={() =>
                                    setSelectedCounts((prev) => ({
                                      ...prev,
                                      // Clicking the last-selected box drops it
                                      // (min 1); otherwise select up to here.
                                      [e.id]:
                                        unpaidIdx + 1 === selectedCount
                                          ? Math.max(1, unpaidIdx)
                                          : unpaidIdx + 1,
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                />
                              ) : (
                                <span>{isPaid ? "✓" : isMissed ? "✗" : "·"}</span>
                              )}
                              <span className="truncate">
                                Installment {inst.installment_number} — {formatDate(inst.due_at)}
                              </span>
                            </span>
                            <span className="font-medium tabular-nums flex-shrink-0">
                              {formatCurrency(Math.round(inst.amount / 100))}
                            </span>
                          </div>
                        );
                      })}

                      {unpaid.length > 0 && canPay && (
                        <div className="flex items-center justify-between gap-3 pt-0.5">
                          <span className="text-xs text-slate-500">
                            {selectedCount > 1
                              ? `Paying ${selectedCount} installments together`
                              : multiSelectable
                                ? "Tick more to pay ahead"
                                : "Next installment"}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => goToCheckout(e, selectedCount)}
                            disabled={isPaying}
                          >
                            {isPaying ? "Opening checkout…" : `Review & pay ${formatCurrency(selectedTotalKobo / 100)}`}
                          </Button>
                        </div>
                      )}
                      {!canPay && unpaid.length > 0 && <p className="text-sm text-amber-800">Payment is unavailable for this enrollment. Contact support or review your Academy enrollment.</p>}
                      <Link href={`/account/academy/enrollments/${e.id}`} className="text-sm font-medium text-cyan-700 hover:underline">View enrollment details →</Link>
                    </div>
                  );
                })}
            </div>
          )}

          <Link href="/account/academy" className="block">
            <Button variant="outline" className="w-full">
              View My Academy →
            </Button>
          </Link>
        </Card>
      )}

      {/* Show pending enrollments */}
      {pendingEnrollments.map((enrollment) => (
        <Card key={enrollment.id} className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">Academy</h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              {enrollment.cohort?.program?.name || "Swimming Program"}
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 md:p-4 text-xs md:text-sm text-amber-800">
            <p className="font-medium">Payment Pending</p>
            <p className="mt-0.5 md:mt-1 text-amber-600">
              Complete your payment to confirm your enrollment in {enrollment.cohort?.name}.
            </p>
          </div>

          <Link
            href={`/account/academy/enrollments/${enrollment.id}`}
            className="block"
          >
            <Button className="w-full sm:w-auto">Complete Payment</Button>
          </Link>
        </Card>
      ))}

      {/* Show option to enroll in more cohorts */}
      {availableCohorts.length > 0 && (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              {myEnrollments.length > 0 ? "Manage or start another Academy programme" : "Want to join Academy?"}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              {myEnrollments.length > 0
                ? `Manage an existing enrollment or explore ${availableCohorts.length} available cohorts.`
                : "Structured swimming programs with expert coaches. Complete your goals faster with personalized training."}
            </p>
            {!communityActive && myEnrollments.length === 0 && (
              <p className="text-xs md:text-sm text-emerald-700 mt-2 font-medium">
                The checkout will show whether this programme is open, requires active annual
                membership, or includes membership in its published price.
              </p>
            )}
          </div>

          {/* Show available cohorts preview */}
          {availableCohorts.length <= 3 && (
            <div className="space-y-2">
              {availableCohorts.map((cohort) => (
                <div
                  key={cohort.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{cohort.name}</p>
                    <p className="text-xs text-slate-500">
                      {cohort.start_date
                        ? `Starts ${formatDate(cohort.start_date)}`
                        : "Coming soon"}
                    </p>
                  </div>
                  <Link
                    href={`/upgrade/academy/cohort?select=${cohort.id}`}
                    className="flex-shrink-0"
                  >
                    <Button variant="secondary" size="sm" className="w-full sm:w-auto">
                      Enroll
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
            <Link href={myEnrollments.length > 0 ? "/account/academy/manage" : "/upgrade/academy/details"} className="block">
              <Button className="w-full sm:w-auto">
                {myEnrollments.length > 0 ? "Manage Academy" : "Enroll in Academy"}
              </Button>
            </Link>
            <Link
              href="/academy"
              className="text-sm text-cyan-600 hover:text-cyan-800 text-center sm:text-left"
            >
              How it works →
            </Link>
          </div>
        </Card>
      )}

      {/* No enrollments and no available cohorts */}
      {myEnrollments.length === 0 && availableCohorts.length === 0 && (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-slate-900">Academy</h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              No cohorts are currently open for enrollment. Check back soon!
            </p>
          </div>
          <Link href="/academy" className="text-sm text-cyan-600 hover:text-cyan-800">
            Learn about Academy programs →
          </Link>
        </Card>
      )}

      {/* Enrolled in all available cohorts */}
      {myEnrollments.length > 0 && availableCohorts.length === 0 && (
        <Card className="p-4 md:p-6 space-y-2 md:space-y-3 bg-slate-50 border-dashed">
          <p className="text-xs md:text-sm text-slate-600">
            ✨ You're enrolled in all currently available cohorts! Check back later for new
            programs.
          </p>
          <Link
            href="/account/academy/browse"
            className="text-sm text-cyan-600 hover:text-cyan-800"
          >
            Browse Academy programs →
          </Link>
        </Card>
      )}
    </>
  );
}
