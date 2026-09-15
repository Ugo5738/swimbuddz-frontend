import type { SessionCostLine } from "@/app/(admin)/admin/sessions/types";

type PricingForm = {
  capacity: number;
  pricing_expected_attendees: number;
  cost_lines: SessionCostLine[];
};

/** Keep automatic per-attendee quantities aligned; preserve explicit overrides. */
export function withExpectedAttendance<T extends PricingForm>(form: T, expected: number): T {
  return {
    ...form,
    pricing_expected_attendees: expected,
    cost_lines: form.cost_lines.map((line) =>
      line.charge_basis === "per_attendee" && line.quantity === form.pricing_expected_attendees
        ? { ...line, quantity: expected }
        : line
    ),
  };
}

export function withSessionCapacity<T extends PricingForm>(form: T, capacity: number): T {
  const expected =
    form.pricing_expected_attendees === form.capacity || form.pricing_expected_attendees > capacity
      ? Math.max(capacity, 1)
      : form.pricing_expected_attendees;
  return { ...withExpectedAttendance(form, expected), capacity };
}
