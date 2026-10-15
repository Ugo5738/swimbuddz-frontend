import { describe, expect, it } from "vitest";
import {
  academyBillingCheckoutPath,
  academyOutstandingKobo,
  academyTuitionSettled,
  remainingAcademyInstallments,
} from "./academyBilling";
import type { Enrollment } from "../types";

const sample = (changes: Partial<Enrollment> = {}): Enrollment => ({
  id: "enrollment-123",
  cohort_id: "cohort-456",
  status: "enrolled",
  payment_status: "paid", // "up to date", not tuition settled
  uses_installments: true,
  total_installments: 3,
  installments: [
    { id: "a", installment_number: 1, amount: 5_000_000, due_at: "2026-09-01", status: "paid" },
    { id: "b", installment_number: 2, amount: 5_000_000, due_at: "2026-10-19", status: "pending" },
    { id: "c", installment_number: 3, amount: 4_500_000, due_at: "2026-11-16", status: "pending" },
  ],
  ...changes,
});

describe("Academy billing from Payments & Credits", () => {
  it("uses the next frozen installment even when payment_status is paid", () => {
    expect(academyOutstandingKobo(sample())).toBe(9_500_000);
    expect(academyTuitionSettled(sample())).toBe(false);
    expect(academyBillingCheckoutPath(sample())).toBe(
      "/checkout?purpose=academy_cohort&cohort_id=cohort-456&enrollment_id=enrollment-123&billing=installments"
    );
  });

  it("explicitly prices the first two outstanding installments in kobo", () => {
    expect(academyBillingCheckoutPath(sample(), 2)).toBe(
      "/checkout?purpose=academy_cohort&cohort_id=cohort-456&enrollment_id=enrollment-123&billing=installments&amount_override_kobo=9500000"
    );
  });

  it("pays a missed installment before a future one", () => {
    const enrollment = sample({
      payment_status: "failed",
      status: "dropout_pending",
      installments: [
        { id: "a", installment_number: 1, amount: 5_000_000, due_at: "2026-09-01", status: "paid" },
        { id: "c", installment_number: 3, amount: 4_500_000, due_at: "2026-11-16", status: "pending" },
        { id: "b", installment_number: 2, amount: 5_000_000, due_at: "2026-10-19", status: "missed" },
      ],
    });
    expect(remainingAcademyInstallments(enrollment).map((i) => i.id)).toEqual(["b", "c"]);
    expect(academyBillingCheckoutPath(enrollment)).toContain("billing=installments");
  });

  it("does not offer checkout for paid/waived schedules", () => {
    const enrollment = sample({
      installments: [
        { id: "a", installment_number: 1, amount: 5_000_000, due_at: "2026-09-01", status: "paid" },
        { id: "b", installment_number: 2, amount: 5_000_000, due_at: "2026-10-19", status: "waived" },
      ],
    });
    expect(academyTuitionSettled(enrollment)).toBe(true);
    expect(academyOutstandingKobo(enrollment)).toBe(0);
    expect(academyBillingCheckoutPath(enrollment)).toBeNull();
  });

  it.each(["dropped", "graduated", "waitlist"])(
    "does not offer payments for closed state %s", (status) => {
      expect(academyBillingCheckoutPath(sample({ status }))).toBeNull();
    }
  );

  it("never invents amounts when installments have not loaded", () => {
    const enrollment = sample({ installments: undefined });
    expect(academyOutstandingKobo(enrollment)).toBeNull();
    expect(academyTuitionSettled(enrollment)).toBe(false);
    expect(academyBillingCheckoutPath(enrollment)).toBeNull();
  });

  it("validates pay-ahead count strictly", () => {
    for (const count of [0, -1, 3, Number.NaN, 1.5]) {
      expect(academyBillingCheckoutPath(sample(), count)).toBeNull();
    }
  });

  it("honors partially reduced negotiated installments", () => {
    const enrollment = sample({
      installments: [
        { id: "a", installment_number: 1, amount: 5_000_000, due_at: "2026-09-01", status: "paid" },
        { id: "b", installment_number: 2, amount: 2_000_000, due_at: "2026-10-19", status: "pending" },
        { id: "c", installment_number: 3, amount: 4_500_000, due_at: "2026-11-16", status: "pending" },
      ],
    });
    expect(academyOutstandingKobo(enrollment)).toBe(6_500_000);
    expect(academyBillingCheckoutPath(enrollment, 2)).toContain("amount_override_kobo=6500000");
  });
});
