import { describe, expect, it } from "vitest";
import { academyPaymentPosition } from "./paymentPosition";
import { EnrollmentStatus, InstallmentStatus, PaymentStatus, type Enrollment } from "./types";

function example(statuses: Array<InstallmentStatus>): Enrollment {
  return {
    id: "enrollment-1", member_id: "member-1", status: EnrollmentStatus.ENROLLED,
    payment_status: PaymentStatus.PAID, created_at: "", updated_at: "",
    price_snapshot_amount: 14500000,
    installments: statuses.map((status, index) => ({
      id: String(index), installment_number: index + 1,
      amount: [5000000, 5000000, 4500000][index],
      due_at: "2026-10-10T00:00:00Z",
      status, created_at: "", updated_at: "",
    })),
  };
}

describe("academy payment position", () => {
  it("shows up to date with 95k outstanding, not fully paid", () => {
    const position = academyPaymentPosition(example([
      InstallmentStatus.PAID, InstallmentStatus.PENDING, InstallmentStatus.PENDING,
    ]));
    expect(position.label).toBe("Up to date");
    expect(position.outstandingKobo).toBe(9500000);
    expect(position.fullySettled).toBe(false);
  });
  it("shows fully paid only after every obligation is settled", () => {
    const position = academyPaymentPosition(example([
      InstallmentStatus.PAID, InstallmentStatus.PAID, InstallmentStatus.PAID,
    ]));
    expect(position.label).toBe("Fully paid");
    expect(position.outstandingKobo).toBe(0);
  });
  it("does not fabricate an outstanding amount when the schedule is absent", () => {
    const position = academyPaymentPosition({...example([]), installments: []});
    expect(position.outstandingKobo).toBeNull();
    expect(position.label).toBe("Payment recorded");
  });
});
