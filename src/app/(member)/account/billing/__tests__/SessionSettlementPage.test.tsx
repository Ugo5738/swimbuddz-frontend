import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutstandingSessionFeesCard } from "../_billing/OutstandingSessionFeesCard";
import SessionSettlementPage from "../sessions/[bookingId]/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  openPayment: null as null | Record<string, unknown>,
  alreadySettled: false,
}));

vi.mock("@/lib/api", () => ({
  apiGet: mocks.get,
  apiPost: mocks.post,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const BOOKING = {
  id: "booking-1",
  session_id: "session-1",
  session_title: "SwimBuddz Yaba Club practice",
  session_starts_at: "2026-11-07T08:00:00Z",
  fee_amount_kobo: 520000,
  settled: false,
  status: "confirmed",
};

describe("SessionSettlementPage open payment & switch flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.openPayment = null;
    mocks.alreadySettled = false;

    mocks.get.mockImplementation(async (path: string) => {
      if (path.endsWith("/settlement")) return BOOKING;
      if (path.endsWith("/open-payment")) {
        return {
          open_payment: mocks.openPayment,
          already_settled: mocks.alreadySettled,
        };
      }
      if (path.endsWith("/wallet/me")) {
        return { status: "active", balance: 57, available_balance: 57 };
      }
      if (path.endsWith("/sessions/bookings/me/unpaid")) {
        return [
          {
            ...BOOKING,
            session_ends_at: "2026-11-07T09:00:00Z",
            channel: "admin",
            booked_at: "2026-11-07T19:56:50Z",
          },
        ];
      }
      throw new Error(`Unexpected GET ${path}`);
    });
  });

  it("shows open Paystack attempt and lets member switch to Bubbles immediately", async () => {
    mocks.openPayment = {
      reference: "PAY-OPEN-1",
      purpose: "session_booking",
      status: "pending",
      payment_method: "paystack",
      amount: 5200,
      currency: "NGN",
      bubbles_to_apply: 0,
      bubbles_value_ngn: 0,
      checkout_url: "https://checkout.paystack.com/open-1",
      can_cancel_and_switch: true,
    };
    mocks.post.mockImplementation(async (path: string) => {
      if (path.endsWith("/open-payment/switch")) {
        mocks.openPayment = null;
        return {
          outcome: "closed_unpaid",
          reference: "PAY-OPEN-1",
          message: "Previous unpaid online attempt closed. You can now switch payment options.",
        };
      }
      if (path === "/api/v1/payments/intents") {
        return {
          reference: "PAY-BUBBLES-2",
          status: "paid",
          entitlement_applied_at: "2026-11-09T22:40:05Z",
        };
      }
      throw new Error(`Unexpected POST ${path}`);
    });

    render(<SessionSettlementPage params={{ bookingId: "booking-1" }} />);

    expect(
      await screen.findByText(/Open payment in progress \(PAY-OPEN-1\)/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Resume online payment/ })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Switch payment method or Bubbles/ })
    );

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/bookings/booking-1/open-payment/switch",
        undefined,
        { auth: true }
      );
    });

    // Slider & Bubbles settlement unlock immediately once closed_unpaid returns.
    fireEvent.click(await screen.findByRole("button", { name: "100%" }));
    fireEvent.click(screen.getByRole("button", { name: "Settle with Bubbles" }));

    expect(await screen.findByText("Session fee settled")).toBeInTheDocument();
  });

  it("settles immediately if Paystack reports the earlier payment succeeded during switch", async () => {
    mocks.openPayment = {
      reference: "PAY-OPEN-1",
      purpose: "session_booking",
      status: "pending",
      payment_method: "paystack",
      amount: 5200,
      currency: "NGN",
      bubbles_to_apply: 0,
      bubbles_value_ngn: 0,
      checkout_url: "https://checkout.paystack.com/open-1",
      can_cancel_and_switch: true,
    };
    mocks.post.mockResolvedValueOnce({
      outcome: "already_paid",
      reference: "PAY-OPEN-1",
      message: "Your earlier online payment actually succeeded! Your session fee is settled.",
    });

    render(<SessionSettlementPage params={{ bookingId: "booking-1" }} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Switch payment method or Bubbles/ })
    );

    expect(await screen.findByText("Session fee settled")).toBeInTheDocument();
  });

  it("hides self-service switch for manual transfer receipts under review", async () => {
    mocks.openPayment = {
      reference: "PAY-TRANSFER-1",
      purpose: "session_booking",
      status: "pending_review",
      payment_method: "manual_transfer",
      amount: 5200,
      currency: "NGN",
      bubbles_to_apply: 0,
      bubbles_value_ngn: 0,
      checkout_url: null,
      can_cancel_and_switch: false,
    };

    render(<SessionSettlementPage params={{ bookingId: "booking-1" }} />);

    expect(
      await screen.findByText(/Open payment in progress \(PAY-TRANSFER-1\)/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Switch payment method or Bubbles/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View receipt status" })).toHaveAttribute(
      "href",
      "/account/billing#bank-transfer-receipts"
    );
  });

  it("surfaces open online attempts and receipt links inside OutstandingSessionFeesCard", async () => {
    render(
      <OutstandingSessionFeesCard
        payments={[
          {
            id: "p1",
            reference: "PAY-OPEN-1",
            status: "pending",
            amount: 5200,
            currency: "NGN",
            purpose: "session_booking",
            session_booking_id: "booking-1",
            payment_method: "paystack",
            created_at: "2026-11-09T22:36:56Z",
          },
        ]}
      />
    );

    expect(await screen.findByText("Open online attempt")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Resume or switch payment" })
    ).toHaveAttribute("href", "/account/billing/sessions/booking-1");
  });
});
