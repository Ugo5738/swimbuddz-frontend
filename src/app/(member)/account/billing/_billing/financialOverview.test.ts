import { describe, expect, it } from "vitest";
import { buildFinancialOverview } from "./financialOverview";
import type { Enrollment, PaymentRecord, UnpaidBooking } from "../types";

const cohort: Enrollment = {
  id: "enr-1", cohort_id: "cohort-1", status: "enrolled", payment_status: "paid",
  cohort: { name: "Zero to 50m · Yaba" },
  installments: [
    { id: "i1", installment_number: 1, status: "paid", amount: 5_000_000, due_at: "2026-09-19" },
    { id: "i2", installment_number: 2, status: "pending", amount: 5_000_000, due_at: "2026-10-19" },
    { id: "i3", installment_number: 3, status: "pending", amount: 4_500_000, due_at: "2026-11-19" },
  ],
};
const session: UnpaidBooking = {
  id: "session-booking-1", session_id: "s1", session_title: "Community Swim",
  session_starts_at: "2026-10-12T10:00:00Z", fee_amount_kobo: 700_000,
};
const today = new Date("2026-10-15T00:00:00Z");

describe("member finance overview", () => {
  it("keeps future Academy obligations out of the currently due total", () => {
    const result = buildFinancialOverview([cohort], [], [], today);
    expect(result.dueKobo).toBe(0);
    expect(result.upcomingKobo).toBe(9_500_000);
    expect(result.upcoming.map(item => item.title)).toEqual(["Zero to 50m · Yaba", "Zero to 50m · Yaba"]);
  });
  it("shows confirmed unpaid session bookings as due, not voluntary renewals", () => {
    const result = buildFinancialOverview([], [session], [], today);
    expect(result.dueKobo).toBe(700_000);
    expect(result.due[0].href).toBe("/account/billing/sessions/session-booking-1");
  });
  it("surfaces missed installment and excludes waived tuition", () => {
    const rows: Enrollment = { ...cohort, installments: [
      { id: "i1", installment_number: 1, status: "waived", amount: 5_000_000, due_at: "2026-09-01" },
      { id: "i2", installment_number: 2, status: "missed", amount: 5_000_000, due_at: "2026-10-01" },
    ] };
    const result = buildFinancialOverview([rows], [], [], today);
    expect(result.dueKobo).toBe(5_000_000);
    expect(result.upcomingKobo).toBe(0);
  });
  it("does not call an unverified bank transfer available debt", () => {
    const transfer = {
      id: "pay-1", reference: "PAY-test", status: "pending_review",
      amount: 50_000, currency: "NGN", created_at: "2026-10-01",
      payment_method: "manual_transfer", purpose: "academy_cohort",
      payment_metadata: { installment_id: "i2" },
    } as PaymentRecord;
    const result = buildFinancialOverview([{ ...cohort, installments: [
      { id: "i2", installment_number: 2, status: "missed", amount: 5_000_000, due_at: "2026-10-01" },
    ] }], [], [transfer], today);
    expect(result.dueKobo).toBe(0);
    expect(result.checking).toHaveLength(1);
    expect(result.checking[0].status).toBe("checking");
  });
  it("does not pretend an incomplete installment plan has zero debt", () => {
    const result = buildFinancialOverview([{ ...cohort, installments: undefined, uses_installments: true, total_installments: 3 }], [], [], today);
    expect(result.needsQuote).toHaveLength(1);
  });
  it("prevents abandoned/closed enrollments from becoming debt", () => {
    const result = buildFinancialOverview([{ ...cohort, status: "dropped" }], [], [], today);
    expect(result.due).toHaveLength(0);
    expect(result.upcoming).toHaveLength(0);
  });
});
