export function canPayAcademyEnrollment(status: string | null | undefined): boolean {
  return status === "pending_approval" || status === "enrolled";
}

/**
 * Enrollment.payment_status describes whether the learner is up to date,
 * not whether every future installment is settled. The frozen schedule
 * determines which tuition obligations remain payable.
 */
export type AcademyPaymentState = {
  status: string | null | undefined;
  payment_status?: string | null;
  installments?: readonly { status: string; amount: number }[] | null;
};

export function hasPayableAcademyBalance(enrollment: AcademyPaymentState): boolean {
  // Dropout review can be cured by paying missed installments. This does not
  // reopen a confirmed dropout, and cannot create a new payment obligation.
  const recoveringFromDropoutReview =
    enrollment.status === "dropout_pending" && !!enrollment.installments?.length;
  if (!canPayAcademyEnrollment(enrollment.status) && !recoveringFromDropoutReview) return false;
  if (enrollment.installments?.length) {
    return enrollment.installments.some(
      (row) => (row.status === "pending" || row.status === "missed") && row.amount > 0
    );
  }
  // Legacy or newly created enrollments may not yet have a frozen schedule.
  return enrollment.payment_status !== "paid" && enrollment.payment_status !== "waived";
}

/**
 * An admin may share this link, but cannot initiate a charge or impersonate the
 * learner. Checkout authenticates the learner, checks enrollment ownership,
 * and gets the payable amount from the payments service.
 */
export function academyPaymentPath(
  enrollment: AcademyPaymentState & { id: string; cohort_id?: string | null }
): string | null {
  if (!hasPayableAcademyBalance(enrollment)) return null;
  const params = new URLSearchParams({
    purpose: "academy_cohort",
    enrollment_id: enrollment.id,
  });
  if (enrollment.cohort_id) params.set("cohort_id", enrollment.cohort_id);
  if (enrollment.installments?.length) params.set("billing", "installments");
  return `/checkout?${params.toString()}`;
}
