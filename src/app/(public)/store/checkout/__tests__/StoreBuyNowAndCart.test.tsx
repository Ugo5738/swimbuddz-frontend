import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StoreCheckoutPage from "../page";

const VARIANT_ID = "11111111-1111-4111-8111-111111111111";
const mocks = vi.hoisted(() => ({
  router: { push: vi.fn() },
  post: vi.fn(),
  get: vi.fn(),
  clearCart: vi.fn(),
  error: vi.fn(),
  cart: {
    id: "cart-123",
    status: "active",
    discount_code: null,
    member_discount_percent: 5,
    requires_size_chart_ack: false,
    subtotal_ngn: 25000,
    discount_amount_ngn: 1250,
    total_ngn: 23750,
    items: [
      {
        id: "cart-item-1",
        variant_id: "cart-variant-1",
        quantity: 1,
        unit_price_ngn: 15000,
        product_name: "Existing swim cap",
        requires_size_chart_ack: false,
      },
      {
        id: "cart-item-2",
        variant_id: "cart-variant-2",
        quantity: 1,
        unit_price_ngn: 10000,
        product_name: "Existing kickboard",
        requires_size_chart_ack: false,
      },
    ],
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post }));
vi.mock("sonner", () => ({
  toast: { error: mocks.error, success: vi.fn() },
}));
vi.mock("@/hooks/useApi", () => ({
  useApi: (path: string) => ({
    data: path.includes("pickup-locations")
      ? [{ id: "location-1", name: "Yaba Pool", address: "Yaba" }]
      : path.includes("wallet")
        ? { status: "active", available_balance: 0, balance: 0 }
        : { balance_ngn: 0 },
    loading: false,
  }),
}));
vi.mock("@/lib/storeCart", () => ({
  useStoreCart: () => ({
    cart: mocks.cart,
    loading: false,
    clearCart: mocks.clearCart,
    isAuthenticated: true,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.post.mockResolvedValue({
    order_id: "order-1",
    order_number: "ORD-1",
    total_ngn: 0,
    delivery_fee_ngn: 0,
    requires_payment: false,
  });
  mocks.get.mockResolvedValue({
    name: "Swimming goggles",
    status: "active",
    sourcing_type: "stocked",
    base_price_ngn: 15000,
    requires_size_chart_ack: false,
    variants: [{
      id: VARIANT_ID,
      sku: "GOGGLE",
      name: "Blue",
      is_active: true,
      quantity_available: 10,
      price_override_ngn: null,
    }],
  });
});
afterEach(() => window.history.replaceState({}, "", "/store/checkout"));

describe("Store Buy Now and Cart checkout separation", () => {
  it("checks out one selected variant while preserving all saved cart items", async () => {
    window.history.replaceState(
      {}, "", `/store/checkout?buyNowVariant=${VARIANT_ID}&quantity=2&product=goggles`
    );
    render(<StoreCheckoutPage />);
    expect(await screen.findByText("Swimming goggles × 2")).toBeInTheDocument();
    expect(screen.queryByText(/Existing swim cap/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Existing kickboard/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₦28,500/ }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        `/api/v1/store/checkout/start?buy_now_variant_id=${VARIANT_ID}&buy_now_quantity=2`,
        expect.objectContaining({ fulfillment_type: "pickup" }),
        { auth: true }
      )
    );
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("checks out multiple cart items together with no Buy Now selection", async () => {
    window.history.replaceState({}, "", "/store/checkout");
    render(<StoreCheckoutPage />);
    expect(await screen.findByText("Existing swim cap × 1")).toBeInTheDocument();
    expect(screen.getByText("Existing kickboard × 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pay ₦23,750/ }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/store/checkout/start",
        expect.objectContaining({ fulfillment_type: "pickup" }),
        { auth: true }
      )
    );
    expect(mocks.clearCart).toHaveBeenCalledOnce();
  });
});
