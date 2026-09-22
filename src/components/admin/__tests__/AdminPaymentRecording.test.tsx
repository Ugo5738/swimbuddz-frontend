import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminPaymentRecording } from "../AdminPaymentRecording";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), upload: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post }));
vi.mock("@/lib/media", () => ({ uploadMedia: mocks.upload }));
const payment = {
  reference: "PAY-TEST",
  payer_email: "student@example.com",
  purpose: "session_booking",
  status: "paid",
  currency: "NGN",
  amount: 15000,
  proof_of_payment_media_id: null,
  entitlement_applied_at: "2026-09-13T12:00:00Z",
  entitlement_error: null,
};

describe("Admin universal payment recording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue([payment]);
    mocks.upload.mockResolvedValue({ id: "receipt-media" });
    mocks.post.mockResolvedValue(payment);
  });
  async function search() {
    render(<AdminPaymentRecording />);
    fireEvent.change(screen.getByLabelText(/Payment reference or payer email/), {
      target: { value: "PAY-TEST" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText(/PAY-TEST · student/);
  }
  it("attaches a receipt to an already paid payment without recording another payment", async () => {
    await search();
    expect(
      screen.queryByRole("button", { name: "Record verified payment" })
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Attach missing receipt"), {
      target: { files: [new File(["proof"], "receipt.pdf")] },
    });
    await screen.findByText("Receipt attached. Payment status was not changed.");
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/payments/admin/PAY-TEST/receipt",
      { proof_media_id: "receipt-media" },
      { auth: true }
    );
  });
  it("records only the saved payable amount and distinguishes pending fulfillment", async () => {
    mocks.get.mockResolvedValue([{ ...payment, status: "pending" }]);
    mocks.post.mockResolvedValue({ ...payment, entitlement_applied_at: null });
    await search();
    fireEvent.click(screen.getByRole("button", { name: "Record verified payment" }));
    fireEvent.change(await screen.findByLabelText(/Transaction or receipt reference/), {
      target: { value: "BANK-ONE" },
    });
    fireEvent.change(screen.getByLabelText(/Admin note/), {
      target: { value: "Bank statement verified" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/admin/PAY-TEST/offline-payment",
        expect.objectContaining({
          amount_kobo: 1500000,
          external_reference: "BANK-ONE",
          payment_method: "bank_transfer",
        }),
        { auth: true }
      )
    );
    await screen.findByText(/Fulfillment is pending/);
  });
});
