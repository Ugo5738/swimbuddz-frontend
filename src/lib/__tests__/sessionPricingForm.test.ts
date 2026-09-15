import { describe, expect, it } from "vitest";
import { withExpectedAttendance, withSessionCapacity } from "../sessionPricingForm";
import type { SessionCostLine } from "@/app/(admin)/admin/sessions/types";

const lines: SessionCostLine[] = [
  {
    category: "pool",
    description: "Pool",
    charge_basis: "per_attendee",
    unit_cost_naira: 6300,
    quantity: 20,
  },
  {
    category: "other",
    description: "Travel",
    charge_basis: "per_staff",
    unit_cost_naira: 3500,
    quantity: 1,
  },
];
describe("session pricing defaults", () => {
  it("resizes per-swimmer costs, not staff travel, when reducing attendance", () => {
    const result = withSessionCapacity(
      { capacity: 20, pricing_expected_attendees: 20, cost_lines: lines },
      2
    );
    expect(result.pricing_expected_attendees).toBe(2);
    expect(result.cost_lines.map((line) => line.quantity)).toEqual([2, 1]);
    const total = result.cost_lines.reduce(
      (sum, line) => sum + line.unit_cost_naira * line.quantity,
      0
    );
    expect(total / result.pricing_expected_attendees).toBe(8050);
  });
  it("keeps a deliberately lower attendance estimate when increasing capacity", () => {
    const result = withSessionCapacity(
      { capacity: 20, pricing_expected_attendees: 10, cost_lines: [] },
      30
    );
    expect(result.pricing_expected_attendees).toBe(10);
  });
  it("preserves explicit quantity overrides for review", () => {
    const result = withExpectedAttendance(
      { capacity: 20, pricing_expected_attendees: 20, cost_lines: [{ ...lines[0], quantity: 2 }] },
      3
    );
    expect(result.cost_lines[0].quantity).toBe(2);
  });
});
