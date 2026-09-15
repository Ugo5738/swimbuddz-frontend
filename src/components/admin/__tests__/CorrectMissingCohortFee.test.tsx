import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { apiPost } from "@/lib/api";
import type { components } from "@/lib/api-types";
import { CorrectMissingCohortFee } from "../CorrectMissingCohortFee";

vi.mock("@/lib/api", () => ({ apiPost: vi.fn() }));
type Booking = components["schemas"]["SessionBookingResponse"];
const booking = {
  id: "booking-1",
  status: "confirmed",
  fee_amount_kobo: 0,
  party_size: 1,
} as Booking;
beforeEach(() => {
  vi.clearAllMocks();
});

it("requires verification and corrects only the fee; it never records or collects payment", async () => {
  const corrected = { ...booking, fee_amount_kobo: 1500000 };
  vi.mocked(apiPost).mockResolvedValue(corrected);
  const onCorrected = vi.fn();
  render(
    <CorrectMissingCohortFee
      booking={booking}
      memberName="Learner"
      defaultFee={15000}
      onCorrected={onCorrected}
    />
  );
  fireEvent.click(screen.getByRole("button", { name: "Correct missing class fee" }));
  expect(screen.getByRole("button", { name: "Save fee correction (not payment)" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText(/^Reason and verification/), {
    target: { value: "Verified originally agreed class fee against receipt" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save fee correction (not payment)" }));
  await waitFor(() => expect(onCorrected).toHaveBeenCalledWith(corrected));
  expect(apiPost).toHaveBeenCalledOnce();
  expect(apiPost).toHaveBeenCalledWith(
    "/api/v1/sessions/bookings/booking-1/admin/reconcile-missing-cohort-fee",
    { fee_amount_kobo: 1500000, reason: "Verified originally agreed class fee against receipt" },
    { auth: true }
  );
});

it.each([
  { payment_intent_id: "paid" },
  { wallet_transaction_id: "wallet" },
  { access_source: "cohort_enrollment" },
  { fee_amount_kobo: 1500000 },
  { party_size: 2 },
])("does not offer correction for protected booking %j", (change) => {
  render(
    <CorrectMissingCohortFee
      booking={{ ...booking, ...change }}
      memberName="Learner"
      defaultFee={15000}
      onCorrected={vi.fn()}
    />
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
