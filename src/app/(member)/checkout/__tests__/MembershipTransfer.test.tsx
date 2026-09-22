import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "../page";

const mocks = vi.hoisted(() => ({
  params: "purpose=community",
  post: vi.fn(),
  router: { push: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams(mocks.params),
}));
vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(async (path: string) =>
    path.endsWith("/pricing")
      ? { community_annual: 20000 }
      : path.endsWith("/wallet/me")
        ? { available_balance: 100 }
        : { id: "member" }
  ),
  apiPost: mocks.post,
}));
vi.mock("@/lib/upgradeContext", () => ({
  UpgradeProvider: ({ children }: { children: React.ReactNode }) => children,
  useUpgrade: () => ({
    state: { discountCode: "" },
    clearState: vi.fn(),
    setDiscountCode: vi.fn(),
  }),
  formatCurrency: (value: number) => `₦${value.toLocaleString()}`,
  getClubCycleLabel: () => "Quarterly",
}));
vi.mock("@/lib/paymentCache", () => ({ savePaymentIntentCache: vi.fn() }));

describe("annual Membership bank receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.params = "purpose=community";
    mocks.post.mockImplementation(async (path: string) =>
      path.endsWith("/preview")
        ? {
            currency: "NGN",
            subtotal_kobo: 2_000_000,
            total_kobo: 2_000_000,
            net_subtotal_kobo: 2_000_000,
            discount_kobo: 0,
            bubbles_to_apply: 0,
            bubbles_value_kobo: 0,
            additional_charges: [],
            components: { community: 2_000_000 },
          }
        : { reference: "PAY-RECEIPT", amount: 20000, status: "pending" }
    );
  });
  it("offers manual transfer and routes to receipt upload without marking payment successful", async () => {
    render(<CheckoutPage />);
    fireEvent.click(await screen.findByRole("radio", { name: /Bank Transfer/ }));
    expect(screen.getByText("Moniepoint MFB")).toBeInTheDocument();
    expect(screen.getByText("6567710856")).toBeInTheDocument();
    expect(screen.getByText("Swimbuddz Limited")).toBeInTheDocument();
    expect(screen.queryByText("7033588400")).not.toBeInTheDocument();
    const button = await screen.findByRole("button", { name: "Continue to transfer details" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/payments/intents",
        expect.objectContaining({
          purpose: "community",
          payment_method: "manual_transfer",
          bubbles_to_apply: 0,
        }),
        { auth: true }
      )
    );
    expect(mocks.router.push).toHaveBeenCalledWith(
      "/account/billing?pending_transfer=PAY-RECEIPT#bank-transfer-receipts"
    );
  });
  it("honours the Already paid link without requiring another payment-method selection", async () => {
    mocks.params += "&payment_method=manual_transfer";
    render(<CheckoutPage />);
    expect(await screen.findByRole("radio", { name: /Bank Transfer/ })).toBeChecked();
    expect(screen.getByText(/Already transferred\? Do not pay again/)).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });
});
