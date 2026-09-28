import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Page from "../page";
const mocks = vi.hoisted(() => ({ post: vi.fn(), settled: false, status: "confirmed" }));
vi.mock("@/lib/api", () => ({ apiPost: mocks.post }));
vi.mock("@/lib/productCheckoutAttempt", () => ({ productCheckoutAttempt: () => ({ idempotencyKey: "stable-key", complete: vi.fn() }) }));
vi.mock("@/hooks/useApi", () => ({ useApi: (path: string) => ({ loading: false, error: null,
  data: path.includes("wallet") ? { status: "active", balance: 100, available_balance: 52 } : {
    id: "booking", session_id: "session", session_title: "Yaba practice", session_starts_at: "2026-09-26T08:00:00Z",
    fee_amount_kobo: 520000, settled: mocks.settled, status: mocks.status,
  } }) }));
vi.mock("@/lib/upgradeContext", () => ({ formatCurrency: (value: number) => `₦${value.toLocaleString()}` }));
describe("outstanding session settlement", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.settled = false; mocks.status = "confirmed";
    mocks.post.mockResolvedValue({ reference: "PAY", status: "paid", entitlement_applied_at: "now" }); });
  it("settles fully with available Bubbles and stable retry identity", async () => {
    render(<Page params={{ bookingId: "booking" }} />);
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    fireEvent.click(screen.getByRole("button", { name: "Settle with Bubbles" }));
    await screen.findByRole("heading", { name: "Session fee settled" });
    expect(mocks.post).toHaveBeenCalledWith("/api/v1/payments/intents", expect.objectContaining({
      direct_amount: 5200, bubbles_to_apply: 52, payment_method: "paystack", idempotency_key: "stable-key",
      payment_metadata: { booking_id: "booking" },
    }), { auth: true });
  });
  it("shows the partial Bubbles cash remainder before payment", async () => {
    render(<Page params={{ bookingId: "booking" }} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Pay ₦3,200 online" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ bubbles_to_apply: 20, direct_amount: 5200 }), expect.anything()));
  });
  it("clears Bubbles when bank transfer is selected", async () => {
    render(<Page params={{ bookingId: "booking" }} />);
    fireEvent.click(screen.getByRole("button", { name: "100%" }));
    fireEvent.click(screen.getByLabelText("Bank transfer"));
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to bank transfer" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ bubbles_to_apply: 0, payment_method: "manual_transfer" }), expect.anything()));
  });
  it("cannot submit an already-settled booking", () => {
    mocks.settled = true;
    render(<Page params={{ bookingId: "booking" }} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
