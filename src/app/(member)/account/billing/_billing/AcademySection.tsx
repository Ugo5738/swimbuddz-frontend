"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useMemo } from "react";

import type { Cohort, Enrollment } from "../types";
import { formatCurrency, formatDate } from "../utils";

type Props = {
  myEnrollments: Enrollment[];
  openCohorts: Cohort[];
  communityActive: boolean;
};

export function AcademySection({ myEnrollments, openCohorts, communityActive }: Props) {
  const { paidEnrollments, pendingEnrollments, availableCohorts } = useMemo(() => {
    const paid = myEnrollments.filter(
      (e) => e.payment_status === "paid" || e.status === "enrolled",
    );
    const pending = myEnrollments.filter(
      (e) => e.payment_status === "pending" && e.status === "pending_approval",
    );
    const enrolledCohortIds = new Set(myEnrollments.map((e) => e.cohort_id));
    const available = openCohorts.filter((c) => !enrolledCohortIds.has(c.id));
    return { paidEnrollments: paid, pendingEnrollments: pending, availableCohorts: available };
  }, [myEnrollments, openCohorts]);

  return (
    <>
      {/* Academy Enrollments Summary */}
      {paidEnrollments.length > 0 && (
        <Card className="p-4 md:p-6 space-y-3 md:space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-slate-900">Academy</h2>
              <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
                {paidEnrollments.length} active enrollment
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
              <span className="font-medium">Active</span>
            </div>
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 md:p-4 text-xs md:text-sm text-emerald-800">
            <p className="font-medium">You're enrolled in the Academy!</p>
            <p className="mt-0.5 md:mt-1 text-emerald-600">
              Track your progress and milestones on the My Academy page.
            </p>
          </div>

          {/* Installment schedule for installment-paying enrollments */}
          {paidEnrollments.some((e) => e.installments && e.installments.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Payment schedule
              </p>
              {paidEnrollments
                .filter((e) => e.installments && e.installments.length > 0)
                .map((e) =>
                  e.installments!.map((inst) => {
                    const isPaid = inst.status === "paid";
                    const isMissed = inst.status === "missed";
                    const isUpcoming =
                      !isPaid && !isMissed && new Date(inst.due_at) > new Date();
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-800"
                            : isMissed
                              ? "bg-red-50 text-red-800"
                              : isUpcoming
                                ? "bg-slate-50 text-slate-700"
                                : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{isPaid ? "✓" : isMissed ? "✗" : "·"}</span>
                          <span>
                            Installment {inst.installment_number} —{" "}
                            {formatDate(inst.due_at)}
                          </span>
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(Math.round(inst.amount / 100))}
                        </span>
                      </div>
                    );
                  }),
                )}
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
            href={`/checkout?purpose=academy_cohort&cohort_id=${enrollment.cohort_id}`}
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
              {myEnrollments.length > 0 ? "Enroll in Another Cohort" : "Want to join Academy?"}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1">
              {myEnrollments.length > 0
                ? `${availableCohorts.length} more cohort${availableCohorts.length > 1 ? "s" : ""} available for enrollment.`
                : "Structured swimming programs with expert coaches. Complete your goals faster with personalized training."}
            </p>
            {!communityActive && myEnrollments.length === 0 && (
              <p className="text-xs md:text-sm text-emerald-700 mt-2 font-medium">
                ✓ Academy enrollment includes Community + Club access — pay once.
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
            <Link href="/upgrade/academy/details" className="block">
              <Button className="w-full sm:w-auto">
                {myEnrollments.length > 0 ? "Browse All Cohorts" : "Enroll in Academy"}
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
