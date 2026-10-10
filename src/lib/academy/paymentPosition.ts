import type { Enrollment } from "./types";
import { InstallmentStatus, PaymentStatus } from "./types";

/**
 * Financial position from frozen, enrollment-specific installments, never the
 * published programme or cohort rate. "paid" on the enrollment is a
 * *current-compliance* state, not proof the complete tuition has been settled.
 */
export function academyPaymentPosition(enrollment: Enrollment) {
  const rows = enrollment.installments ?? [];
  const hasSchedule = rows.length > 0;
  const outstandingKobo = hasSchedule
    ? rows.filter((row) => row.status === InstallmentStatus.PENDING
      || row.status === InstallmentStatus.MISSED)
      .reduce((sum, row) => sum + row.amount, 0)
    : null;
  const paidCount = rows.filter((row) => row.status === InstallmentStatus.PAID).length;
  const waivedCount = rows.filter((row) => row.status === InstallmentStatus.WAIVED).length;
  const missedCount = rows.filter((row) => row.status === InstallmentStatus.MISSED).length;
  const fullySettled = hasSchedule && outstandingKobo === 0;
  const upToDate = !enrollment.access_suspended && missedCount === 0
    && (paidCount > 0 || enrollment.payment_status === PaymentStatus.PAID);

  let label = "Payment status unavailable";
  if (hasSchedule) {
    if (fullySettled) label = waivedCount ? "All obligations settled" : "Fully paid";
    else if (missedCount > 0 || enrollment.access_suspended) label = "Payment overdue";
    else if (upToDate) label = "Up to date";
    else label = "Awaiting payment";
  } else if (enrollment.payment_status === PaymentStatus.PAID) {
    label = "Payment recorded";
  } else if (enrollment.payment_status === PaymentStatus.WAIVED) {
    label = "Payment waived";
  } else if (enrollment.payment_status === PaymentStatus.FAILED) {
    label = "Payment needs review";
  } else {
    label = "Awaiting payment";
  }

  return {
    label,
    hasSchedule,
    outstandingKobo,
    paidCount,
    waivedCount,
    missedCount,
    fullySettled,
    upToDate,
  };
}

export const formatAcademyNaira = (kobo: number) =>
  `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
