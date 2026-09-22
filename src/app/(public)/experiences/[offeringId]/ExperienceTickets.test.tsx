import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExperienceTicketPage from "./page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  token: vi.fn(),
  quote: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ offeringId: "q4" }) }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post, apiPut: mocks.put }));
vi.mock("@/lib/auth", () => ({ getCurrentAccessToken: mocks.token }));
vi.mock("@/lib/clubOnboarding", () => ({ quoteCommunityExperience: mocks.quote }));
vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    error: null,
    data: {
      id: "q4",
      name: "December trip",
      max_guests_per_member: 2,
      ticket_options: [
        { kind: "public_guest", amount_kobo: 6_000_000 },
        { kind: "member_guest", amount_kobo: 5_500_000 },
      ],
      events: [
        {
          id: "event",
          title: "Weekend trip",
          start_time: "2026-12-05T09:00:00Z",
          end_time: "2026-12-06T17:00:00Z",
          location: null,
          location_area: "Lagos",
          is_location_private: true,
        },
      ],
    },
  }),
}));

describe("Experience ticket checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.token.mockResolvedValue(null);
    mocks.get.mockResolvedValue([]);
    mocks.post.mockImplementation(
      async (path: string, body: { discount_code?: string; bubbles_to_apply?: number }) => {
        if (path.endsWith("/checkout-preview"))
          return {
            subtotal_kobo: 6000000,
            discount_code: body.discount_code,
            discount_kobo: body.discount_code ? 600000 : 0,
            net_subtotal_kobo: body.discount_code ? 5400000 : 6000000,
            bubbles_to_apply: body.bubbles_to_apply || 0,
            bubbles_value_kobo: (body.bubbles_to_apply || 0) * 10000,
            total_kobo:
              (body.discount_code ? 5400000 : 6000000) - (body.bubbles_to_apply || 0) * 10000,
            additional_charges: [],
            additional_charges_total_kobo: 0,
          };
        if (path.endsWith("/checkout")) throw new Error("Network interrupted — retry this order");
        return {
          id: "order",
          status: "pending_payment",
          amount_kobo: 6_000_000,
          membership_fee_kobo: 0,
          expires_at: "2099-12-05T09:30:00Z",
          payment_reference: "EXPERIENCE-ONE",
          tickets: [
            {
              id: "ticket",
              full_name: "Visitor Test",
              ticket_kind: "public_guest",
              price_kobo: 6_000_000,
            },
          ],
          events: [],
        };
      }
    );
  });
  it("reserves a public guest at server price without annual Membership or client totals", async () => {
    render(<ExperienceTicketPage />);
    await screen.findByText("December trip");
    const fields: Record<string, string> = {
      "Full name": "Visitor Test",
      Email: "visitor@example.com",
      Phone: "08012345678",
      "Emergency contact name": "Contact",
      "Emergency contact phone": "08098765432",
    };
    Object.entries(fields).forEach(([name, value]) =>
      fireEvent.change(screen.getByLabelText(name), { target: { value } })
    );
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Reserve and review exact price" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        expect.stringContaining("/orders"),
        expect.objectContaining({ include_member: true }),
        { auth: true }
      )
    );
    const payload = mocks.post.mock.calls[0][1];
    expect(payload.participant.full_name).toBe("Visitor Test");
    expect(payload.participant.waiver_accepted).toBe(true);
    expect(payload).not.toHaveProperty("amount_kobo");
    expect(payload.guests).toEqual([]);
    expect(await screen.findByText(/Subtotal: ₦60,000/)).toBeInTheDocument();
    expect(screen.queryByText(/^Annual SwimBuddz Membership:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
  });
  it("restores a paid ticket rather than prompting for another payment", async () => {
    localStorage.setItem(
      "swimbuddz:experience:q4",
      JSON.stringify({ idempotency_key: "key", access_token: "secret", order_id: "order" })
    );
    mocks.post.mockResolvedValue({
      id: "order",
      status: "confirmed",
      amount_kobo: 6_000_000,
      membership_fee_kobo: 0,
      expires_at: "2026-12-05T09:30:00Z",
      payment_reference: "EXPERIENCE-ONE",
      tickets: [
        {
          id: "ticket",
          full_name: "Visitor Test",
          ticket_kind: "public_guest",
          price_kobo: 6_000_000,
        },
      ],
      events: [],
    });
    render(<ExperienceTicketPage />);
    expect(await screen.findByText("Confirmed tickets")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reserve and review exact price" })
    ).not.toBeInTheDocument();
  });

  it("sends a member's reviewed discount and Bubbles with authentication and freezes them for retry", async () => {
    mocks.token.mockResolvedValue("member-token");
    mocks.quote.mockResolvedValue({ amount_kobo: 5000000, already_purchased: false });
    mocks.get.mockImplementation(async (path: string) =>
      path.endsWith("/wallet/me") ? { balance: 100, available_balance: 80 } : []
    );
    localStorage.setItem(
      "swimbuddz:experience:q4",
      JSON.stringify({ idempotency_key: "key", access_token: "secret", order_id: "order" })
    );
    render(<ExperienceTicketPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Have a discount code?" }));
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "TRIP" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
    await screen.findByText(/Discount TRIP/);
    fireEvent.change(await screen.findByRole("slider"), { target: { value: "10" } });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByText("Network interrupted — retry this order");
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/clubs/community-experiences/orders/order/checkout",
      {
        access_token: "secret",
        discount_code: "TRIP",
        bubbles_to_apply: 10,
        payment_method: "paystack",
        expected_total_kobo: 5300000,
      },
      { auth: true }
    );
    expect(screen.getByRole("slider")).toBeDisabled();
    const saved = JSON.parse(localStorage.getItem("swimbuddz:experience:q4")!);
    expect(saved.checkout_started).toBe(true);
    expect(saved.adjustments).toEqual({ discount_code: "TRIP", bubbles_to_apply: 10 });
  });

  it("restores the original payment selection after an uncertain response", async () => {
    localStorage.setItem(
      "swimbuddz:experience:q4",
      JSON.stringify({
        idempotency_key: "key",
        access_token: "secret",
        order_id: "order",
        checkout_started: true,
        adjustments: { discount_code: "TRIP", bubbles_to_apply: 0 },
      })
    );
    render(<ExperienceTicketPage />);
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        expect.stringContaining("/checkout-preview"),
        {
          access_token: "secret",
          discount_code: "TRIP",
          bubbles_to_apply: 0,
          payment_method: "paystack",
        },
        { auth: true }
      )
    );
    expect(await screen.findByLabelText("Discount code")).toHaveValue("TRIP");
    expect(screen.getByLabelText("Discount code")).toBeDisabled();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("offers bank transfer and sends that method with the reviewed amount", async () => {
    localStorage.setItem(
      "swimbuddz:experience:q4",
      JSON.stringify({ idempotency_key: "key", access_token: "secret", order_id: "order" })
    );
    render(<ExperienceTicketPage />);
    fireEvent.click(await screen.findByRole("radio", { name: "Bank transfer" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        expect.stringContaining("/checkout-preview"),
        expect.objectContaining({ payment_method: "manual_transfer", bubbles_to_apply: 0 }),
        { auth: true }
      )
    );
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await screen.findByText("Network interrupted — retry this order");
    expect(mocks.post).toHaveBeenCalledWith(
      expect.stringContaining("/checkout"),
      expect.objectContaining({
        payment_method: "manual_transfer",
        expected_total_kobo: 6000000,
        bubbles_to_apply: 0,
      }),
      { auth: true }
    );
    expect(JSON.parse(localStorage.getItem("swimbuddz:experience:q4")!).payment_method).toBe(
      "manual_transfer"
    );
    expect(screen.getByRole("radio", { name: "Pay online" })).toBeDisabled();
  });
});
