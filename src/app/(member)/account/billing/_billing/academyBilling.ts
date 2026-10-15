import { academyPaymentPath } from "@/lib/academy/paymentEligibility";
import type { Enrollment, EnrollmentInstallment } from "../types";

/**
 * Frozen enrollment installments are the financial source of truth.
 * A top-level payment_status of "paid" can simply mean "up to date".
 */
export function remainingAcademyInstallments(enrollment: Enrollment): EnrollmentInstallment[] {
  return [...(enrollment.installments ?? [])]
    .filter(
      (item) =>
        (item.status === "pending" || item.status === "missed") &&
        Number.isSafeInteger(item.amount) &&
        item.amount > 0
    )
    .sort((a, b) => a.installment_number - b.installment_number);
}

export function academyOutstandingKobo(enrollment: Enrollment): number | null {
  if (!enrollment.installments?.length) return null;
  return remainingAcademyInstallments(enrollment).reduce((sum, item) => sum + item.amount, 0);
}

export function academyTuitionSettled(enrollment: Enrollment): boolean {
  if (enrollment.installments?.length) {
    return enrollment.installments.every((item) => item.status === "paid" || item.status === "waived");
  }
  // Do not mistake an omitted installment schedule for a completed payment.
  if ((enrollment.total_installments ?? 0) > 0 || enrollment.uses_installments) return false;
  return enrollment.payment_status === "paid" || enrollment.payment_status === "waived";
}

/**
 * The button on Payments & Credits navigates to canonical Academy checkout.
 * NO payment intent is created until the learner reviews a server quote there.
 * The member may pay the oldest unpaid installment, or an exact consecutive
 * prefix of their frozen schedule. Backend independently reprices & validates.
 */
export function academyBillingCheckoutPath(
  enrollment: Enrollment,
  installmentCount = 1
): string | null {
  if (!Number.isSafeInteger(installmentCount) || installmentCount < 1) return null;
  const remaining = remainingAcademyInstallments(enrollment);
  if (!remaining.length || installmentCount > remaining.length) return null;
  const base = academyPaymentPath(enrollment);
  if (!base) return null;

  const params = new URLSearchParams(base.split("?")[1]);
  params.set("billing", "installments");
  if (installmentCount > 1) {
    const amount = remaining
      .slice(0, installmentCount)
      .reduce((sum, item) => sum + item.amount, 0);
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    params.set("amount_override_kobo", String(amount));
  } else {
    params.delete("amount_override_kobo");
  }
  return `/checkout?${params.toString()}`;
}
