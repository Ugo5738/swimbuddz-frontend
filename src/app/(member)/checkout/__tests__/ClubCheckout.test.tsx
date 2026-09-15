import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "../page";

const mocks = vi.hoisted(() => ({
  selected: false,
  membership: 0,
  available: true,
  mode: "transition_per_session",
  preview: vi.fn(),
  post: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  state: { discountCode: "", clubBillingCycle: "quarterly" },
  setSelectedCohort: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () =>
    new URLSearchParams(`purpose=club&application_id=ay&payment_mode=${mocks.mode}`),
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(async (path: string) =>
    path.endsWith("/pricing")
      ? { community_annual: 20000 }
      : path.endsWith("/wallet/me")
        ? { balance: 500, available_balance: 500 }
        : { id: "member" }
  ),
  apiPost: mocks.post,
}));
vi.mock("@/lib/clubOnboarding", () => ({ previewClubCheckout: mocks.preview }));
vi.mock("@/lib/upgradeContext", () => ({
  UpgradeProvider: ({ children }: { children: React.ReactNode }) => children,
  useUpgrade: () => ({
    state: mocks.state,
    setDiscountCode: vi.fn(),
    clearState: vi.fn(),
    setSelectedCohort: mocks.setSelectedCohort,
  }),
  formatCurrency: (amount: number) => `₦${amount.toLocaleString()}`,
  getClubCycleLabel: () => "Quarterly",
}));
vi.mock("@/lib/paymentCache", () => ({ savePaymentIntentCache: vi.fn() }));

describe("Club checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.selected = false;
    mocks.membership = 0;
    mocks.available = true;
    mocks.mode = "transition_per_session";
    mocks.post.mockResolvedValue({ reference: "PAY-AY", amount: 0, status: "paid" });
    mocks.preview.mockImplementation(
      async (
        _id: string,
        _method: string,
        mode: string,
        choice?: boolean,
        adjustments: { discount_code?: string; bubbles_to_apply?: number } = {}
      ) => {
        const selected = mocks.available && (choice ?? mocks.selected);
        const fee = mode === "transition_per_session" ? 5_000_000 : 3_000_000;
        const club = mode === "transition_per_session" ? 0 : 6_500_000;
        const total = club + mocks.membership + (selected ? fee : 0);
        const discount = adjustments.discount_code === "CLUB10" ? club / 10 : 0;
        const bubbles = adjustments.bubbles_to_apply || 0;
        return {
          currency: "NGN",
          subtotal_kobo: total,
          total_kobo: total - discount - bubbles * 10000,
          discount_code: adjustments.discount_code,
          discount_kobo: discount,
          discount_allocations_kobo: discount ? { club: discount } : {},
          net_subtotal_kobo: total - discount,
          bubbles_to_apply: bubbles,
          bubbles_value_kobo: bubbles * 10000,
          additional_charges: [],
          components: {
            club,
            club_payment_mode: mode,
            approved_payment_modes: [mode],
            transition_expires_at: "2026-11-30",
            annual_swimbuddz_membership: mocks.membership,
            community_experience_selected: selected,
            community_experience: selected ? fee : 0,
            community_experience_option: mocks.available
              ? {
                  name: "Q4 Community Experience",
                  offering_id: "experience",
                  amount_kobo: fee,
                  price_context:
                    mode === "transition_per_session" ? "standard_member" : "club_bundle",
                }
              : null,
          },
        };
      }
    );
  });

  it("activates zero-due Club access without payment-method controls or a forced Experience", async () => {
    render(<CheckoutPage />);
    const activate = await screen.findByRole("button", { name: "Activate Club access" });
    expect(screen.getByRole("heading", { name: "Activate your Club access" })).toBeInTheDocument();
    expect(screen.getByText("Nothing due today")).toBeInTheDocument();
    expect(screen.queryByText("Payment Method")).not.toBeInTheDocument();
    expect(screen.queryByText("Order Summary")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Add Q4 Community Experience/ })).not.toBeChecked();
    expect(screen.getByText(/Pay per swim until/)).toHaveTextContent("30 Nov 2026");
    fireEvent.click(activate);
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/intents",
        expect.objectContaining({
          club_community_experience_selected: false,
          club_payment_mode: "transition_per_session",
        }),
        { auth: true }
      )
    );
  });

  it("preserves the application Experience choice at Standard price and lets the member opt out", async () => {
    mocks.selected = true;
    render(<CheckoutPage />);
    expect(
      await screen.findByRole("button", { name: "Pay ₦50,000 & activate Club access" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Standard member price/)).toBeInTheDocument();
    const choice = screen.getByRole("checkbox", { name: /Add Q4 Community Experience/ });
    expect(choice).toBeChecked();
    fireEvent.click(choice);
    await screen.findByRole("button", { name: "Activate Club access" });
    expect(mocks.preview).toHaveBeenLastCalledWith(
      "ay",
      "paystack",
      "transition_per_session",
      false,
      {}
    );
    expect(screen.queryByText("Payment Method")).not.toBeInTheDocument();
  });

  it("can add Experience during checkout and submits the exact reviewed selection", async () => {
    render(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Add Q4 Community Experience/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Pay ₦50,000 & activate Club access" })
    );
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/intents",
        expect.objectContaining({ club_community_experience_selected: true }),
        { auth: true }
      )
    );
  });

  it("shows annual Membership due separately and totals it with the optional Experience", async () => {
    mocks.membership = 2_000_000;
    mocks.selected = true;
    render(<CheckoutPage />);
    await screen.findByRole("button", { name: "Pay ₦70,000 & activate Club access" });
    expect(screen.getByText("SwimBuddz Membership — annual")).toBeInTheDocument();
    expect(screen.getByText("₦20,000")).toBeInTheDocument();
    expect(screen.getByText("Payment Method")).toBeInTheDocument();
  });

  it("does not offer an unavailable Experience", async () => {
    mocks.available = false;
    render(<CheckoutPage />);
    await screen.findByRole("button", { name: "Activate Club access" });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps quarterly Club checkout and bundle pricing unchanged", async () => {
    mocks.mode = "quarterly_prepaid";
    mocks.selected = true;
    render(<CheckoutPage />);
    await screen.findByRole("button", { name: "Pay ₦95,000" });
    expect(screen.getByRole("heading", { name: "Review & Pay" })).toBeInTheDocument();
    expect(screen.getByText(/Club bundle price when you buy the quarter/)).toBeInTheDocument();
  });

  it("does not send a zero activation to transfer-proof upload after opting out", async () => {
    mocks.selected = true;
    render(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("radio", { name: /Bank Transfer/ }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /Add Q4 Community Experience/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Activate Club access" }));
    await waitFor(() => expect(mocks.router.push).toHaveBeenCalledWith("/account/billing"));
  });

  it("shows discounts for Membership due but reconciles an existing transfer without Bubbles or another charge", async () => {
    mocks.membership = 2000000;
    mocks.post.mockResolvedValue({ reference: "PAY-TRANSFER", amount: 20000, status: "pending" });
    render(<CheckoutPage />);
    expect(
      await screen.findByRole("button", { name: "Have a discount code?" })
    ).toBeInTheDocument();
    fireEvent.change(await screen.findByRole("slider", { name: "Bubbles to apply" }), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Bank Transfer/ }));
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByText(/Already transferred\? Do not pay again/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Confirm & Get Reference" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/intents",
        expect.objectContaining({
          payment_method: "manual_transfer",
          bubbles_to_apply: 0,
          club_payment_mode: "transition_per_session",
          club_community_experience_selected: false,
        }),
        { auth: true }
      )
    );
    expect(mocks.router.push).toHaveBeenCalledWith(
      "/account/billing?pending_transfer=PAY-TRANSFER"
    );
  });

  it("submits the reviewed discount and partial Bubbles without discounting Membership", async () => {
    mocks.mode = "quarterly_prepaid";
    mocks.membership = 2000000;
    render(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Have a discount code?" }));
    fireEvent.change(screen.getByLabelText("Discount code"), { target: { value: "CLUB10" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply code" }));
    await screen.findByRole("button", { name: "Pay ₦78,500" });
    expect(screen.getByText("₦20,000")).toBeInTheDocument();
    fireEvent.change(await screen.findByRole("slider", { name: "Bubbles to apply" }), {
      target: { value: "10" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Pay ₦77,500 + 10 Bubbles" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/intents",
        expect.objectContaining({
          discount_code: "CLUB10",
          bubbles_to_apply: 10,
          expected_total_kobo: 7750000,
          idempotency_key: expect.any(String),
        }),
        { auth: true }
      )
    );
  });
});
