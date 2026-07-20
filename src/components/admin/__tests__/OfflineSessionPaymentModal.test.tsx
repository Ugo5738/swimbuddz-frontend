import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OfflineSessionPaymentModal } from "../OfflineSessionPaymentModal";

describe("OfflineSessionPaymentModal", () => {
  it("submits receipt details without accepting a client amount", async () => {
    const onSubmit = vi.fn();
    render(
      <OfflineSessionPaymentModal
        memberName="Test Member"
        amountNaira={3500}
        submitting={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(await screen.findByText("₦3,500")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Transaction or receipt reference/), {
      target: { value: "BANK-123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      payment_method: "bank_transfer",
      external_reference: "BANK-123",
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("amount_naira");
  });

  it("requires a verification note for another payment method", async () => {
    render(
      <OfflineSessionPaymentModal
        memberName="Test Member"
        amountNaira={3500}
        submitting={false}
        error={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const method = await screen.findByLabelText("Payment method");
    fireEvent.change(method, { target: { value: "other" } });

    expect(screen.getByLabelText(/Verification note/)).toBeRequired();
  });
});
