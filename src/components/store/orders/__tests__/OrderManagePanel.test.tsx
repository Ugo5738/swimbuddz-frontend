import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderManagePanel } from "../OrderManagePanel";
import {
  effectiveOrderTotal,
  type OrderActionEligibility,
  type StoreOrderDetail,
} from "@/lib/storeOrderLifecycle";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/lib/media", () => ({
  uploadMedia: vi.fn(),
}));

const baseOrder: StoreOrderDetail = {
  id: "order-1",
  order_number: "SB-20261125-TEST1",
  status: "paid",
  payment_status: "paid",
  fulfillment_status: "awaiting_preparation",
  fulfillment_type: "pickup",
  subtotal_ngn: 25000,
  discount_amount_ngn: 2500,
  store_credit_applied_ngn: 2500,
  delivery_fee_ngn: 0,
  order_total_ngn: 22500,
  cash_payable_ngn: 15000,
  total_ngn: 15000,
  bubbles_applied: 50,
  discount_code: null,
  customer_notes: null,
  admin_notes: null,
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
  paid_at: "2026-11-25T10:05:00Z",
  items: [
    {
      id: "item-1",
      variant_id: "var-1",
      product_name: "Pro Swim Goggles",
      variant_name: "Black",
      sku: "GOG-BLK",
      quantity: 1,
      unit_price_ngn: 25000,
      line_total_ngn: 25000,
    },
  ],
};

function makeEligibility(overrides: Partial<OrderActionEligibility> = {}): OrderActionEligibility {
  return {
    order_number: baseOrder.order_number,
    payment_status: "paid",
    fulfillment_status: "awaiting_preparation",
    can_self_cancel_unpaid: false,
    can_self_cancel_paid: false,
    can_request_cancel: false,
    can_swap_variant: false,
    can_request_return_exchange: false,
    can_report_defect: false,
    has_preorder_or_dropship: false,
    has_swimwear_items: false,
    has_open_case: false,
    payment_pending_review: false,
    policy_notes: [],
    full_cancel_refund_preview: {
      cash_refund_ngn: 15000,
      bubbles_refund: 50,
      store_credit_refund_ngn: 2500,
      total_refund_value_ngn: 22500,
      delivery_fee_included: true,
      payment_method: "paystack",
    },
    cases: [],
    refunds: [],
    ...overrides,
  };
}

describe("OrderManagePanel (ADR-023)", () => {
  it("computes true effective order total independently of Bubbles and Store Credit tenders", () => {
    expect(effectiveOrderTotal(baseOrder)).toBe(22500);
    expect(
      effectiveOrderTotal({
        subtotal_ngn: 15000,
        discount_amount_ngn: 0,
        delivery_fee_ngn: 2000,
      })
    ).toBe(17000);
  });

  it("shows instant Cancel Order and Change Size / Color for stocked orders awaiting prep", () => {
    render(
      <OrderManagePanel
        order={baseOrder}
        eligibility={makeEligibility({
          can_self_cancel_paid: true,
          can_swap_variant: true,
        })}
        onUpdated={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Cancel Order/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Size \/ Color/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request Cancellation/i })).not.toBeInTheDocument();
  });

  it("shows Request Cancellation (not instant self-cancel) for preorder or in-progress orders", () => {
    render(
      <OrderManagePanel
        order={baseOrder}
        eligibility={makeEligibility({
          can_self_cancel_paid: false,
          can_request_cancel: true,
          has_preorder_or_dropship: true,
        })}
        onUpdated={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Request Cancellation/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Cancel Order$/i })).not.toBeInTheDocument();
  });

  it("shows 7-day Return or Exchange and FCCPA Defect Claim actions after delivery", () => {
    render(
      <OrderManagePanel
        order={{ ...baseOrder, status: "delivered", fulfillment_status: "delivered" }}
        eligibility={makeEligibility({
          fulfillment_status: "delivered",
          can_request_return_exchange: true,
          can_report_defect: true,
          has_swimwear_items: true,
          return_window_ends_at: "2026-12-02T10:00:00Z",
          policy_notes: [
            "Swimwear change-of-mind returns/exchanges require items to be unworn with hygiene seals and original tags intact.",
          ],
        })}
        onUpdated={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /Return or Exchange/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Report Defective \/ Wrong Item/i })).toBeInTheDocument();
    expect(screen.getByText(/hygiene seals/i)).toBeInTheDocument();
  });
});
