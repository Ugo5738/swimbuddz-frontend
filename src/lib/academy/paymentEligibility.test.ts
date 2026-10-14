import { describe, expect, it } from "vitest";
import { academyPaymentPath, hasPayableAcademyBalance } from "./paymentEligibility";

const enrollment = (statuses: string[], payment_status = "paid") => ({
  id: "enrollment-123",
  cohort_id: "cohort-123",
  status: "enrolled",
  payment_status,
  installments: statuses.map((status, index) => ({
    status,
    amount: [5000000, 5000000, 4500000][index] || 1000000,
  })),
});

describe("Academy outstanding installment payment", () => {
  it("allows the second installment when the first is paid", () => {
    const value = enrollment(["paid", "pending", "pending"]);
    expect(hasPayableAcademyBalance(value)).toBe(true);
    expect(academyPaymentPath(value)).toBe(
      "/checkout?purpose=academy_cohort&enrollment_id=enrollment-123&cohort_id=cohort-123&billing=installments"
    );
  });

  it("allows a missed installment but not a settled schedule", () => {
    expect(hasPayableAcademyBalance(enrollment(["paid", "missed"]))).toBe(true);
    expect(hasPayableAcademyBalance(enrollment(["paid", "waived"]))).toBe(false);
    expect(hasPayableAcademyBalance(enrollment(["paid", "paid"]))).toBe(false);
  });

  it.each(["waitlist", "dropped", "dropout_pending", "graduated"])(
    "never generates a payment link for %s", (status) => {
      const value = { ...enrollment(["paid", "pending"]), status };
      expect(academyPaymentPath(value)).toBeNull();
    }
  );

  it("keeps unscheduled legacy unpaid enrollments payable", () => {
    const value = enrollment([], "pending");
    expect(hasPayableAcademyBalance(value)).toBe(true);
    expect(academyPaymentPath(value)).not.toContain("billing=installments");
  });

  it("does not resell paid legacy enrollment", () => {
    expect(academyPaymentPath(enrollment([], "paid"))).toBeNull();
  });

  it("does not offer a zero-value obligation", () => {
    expect(hasPayableAcademyBalance({
      ...enrollment(["pending"]), installments: [{ status: "pending", amount: 0 }]
    })).toBe(false);
  });
});
