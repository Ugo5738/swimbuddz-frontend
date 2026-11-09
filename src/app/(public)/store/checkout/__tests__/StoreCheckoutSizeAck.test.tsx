import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StoreCheckoutPage from "../page";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
  post: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  cart: {
    id: "cart-123",
    status: "active",
    discount_code: null,
    member_discount_percent: null,
    requires_size_chart_ack: true,
    subtotal_ngn: 60000,
    discount_amount_ngn: 0,
    total_ngn: 60000,
    items: [
      {
        id: "item-1",
        variant_id: "var-1",
        quantity: 2,
        unit_price_ngn: 30000,
        product_name: "Full Coverage 2-Piece Swim Set",
        variant_name: "Army Green / M",
        sku: "FC-AG-M",
        image_url: null,
        requires_size_chart_ack: true,
      },
    ],
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("sonner", () => ({
  toast: {
    error: (msg: string) => mocks.toastError(msg),
    success: (msg: string) => mocks.toastSuccess(msg),
  },
}));

vi.mock("@/lib/api", () => ({
  apiPost: mocks.post,
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: (path: string) => {
    if (path.includes("pickup-locations")) {
      return { data: [{ id: "loc-1", name: "National Stadium Pool", address: "Surulere" }], loading: false };
    }
    if (path.includes("credits")) {
      return { data: { id: "cred-1", balance_ngn: 0 }, loading: false };
    }
    if (path.includes("wallet")) {
      return { data: { balance: 0, available_balance: 0, status: "active" }, loading: false };
    }
    return { data: null, loading: false };
  },
}));

vi.mock("@/lib/storeCart", () => ({
  useStoreCart: () => ({
    cart: mocks.cart,
    loading: false,
    clearCart: vi.fn(),
    isAuthenticated: true,
  }),
}));

describe("Store Checkout - Size Chart Acknowledgment & Ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the size chart acknowledgment notice when cart contains swimwear", async () => {
    render(<StoreCheckoutPage />);

    expect(
      await screen.findByText(/I have reviewed the size chart and understand that swimwear sizing may vary/i)
    ).toBeInTheDocument();

    const payButton = screen.getByRole("button", { name: /Pay ₦60,000/i });
    expect(payButton).toBeDisabled();
  });

  it("enables payment once size chart is acknowledged and includes size_chart_acknowledged: true in payload", async () => {
    mocks.post.mockImplementation(async (path: string) => {
      if (path === "/api/v1/store/checkout/start") {
        return {
          order_id: "order-123",
          order_number: "ORD-9999",
          total_ngn: 60000,
          delivery_fee_ngn: 0,
          requires_payment: true,
        };
      }
      if (path === "/api/v1/store/checkout/payment") {
        return {
          payment_reference: "ref-9999",
          authorization_url: "https://checkout.paystack.com/test",
          access_code: "acc-123",
        };
      }
      return {};
    });

    render(<StoreCheckoutPage />);

    const checkbox = await screen.findByRole("checkbox", {
      name: /I have reviewed the size chart and understand that swimwear sizing may vary/i,
    });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const payButton = screen.getByRole("button", { name: /Pay ₦60,000/i });
    expect(payButton).toBeEnabled();

    fireEvent.click(payButton);

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/store/checkout/start",
        expect.objectContaining({
          size_chart_acknowledged: true,
          fulfillment_type: "pickup",
        }),
        { auth: true }
      );
    });
  });
});
