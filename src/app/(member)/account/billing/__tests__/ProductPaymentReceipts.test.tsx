import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { FinancialOverview } from "../_billing/FinancialOverviewCard";
import { ProductPaymentReceipts } from "../_billing/ProductPaymentReceipts";

it("shows cash and Bubbles separately even when cash paid is zero", () => {
  render(
    <ProductPaymentReceipts
      payments={[
        {
          id: "payment",
          reference: "PAY-ONE",
          amount: 0,
          currency: "NGN",
          status: "paid",
          purpose: "community",
          created_at: "2026-09-12T10:00:00Z",
          payment_metadata: {
            checkout_quote: {
              subtotal_kobo: 2000000,
              discount_kobo: 200000,
              bubbles_to_apply: 180,
              total_kobo: 0,
              additional_charges_total_kobo: 0,
            },
          },
        },
      ]}
    />
  );
  expect(screen.getByText(/₦0 cash \+ 180 Bubbles/)).toBeInTheDocument();
  expect(screen.getByText("Original price")).toBeInTheDocument();
  expect(screen.getByText("−₦2,000")).toBeInTheDocument();
  expect(screen.getByText("PAY-ONE")).toBeInTheDocument();
  expect(screen.getByText(/Do not pay again/)).toBeInTheDocument();
});

it("lists regular payments without checkout_quote metadata instead of hiding them", () => {
  render(
    <ProductPaymentReceipts
      payments={[
        {
          id: "pay-session",
          reference: "PAY-SESS-1",
          amount: 15000,
          currency: "NGN",
          status: "paid",
          purpose: "session_fee",
          payment_method: "manual_transfer",
          created_at: "2026-11-10T10:00:00Z",
          entitlement_applied_at: "2026-11-10T11:00:00Z",
        },
      ]}
    />
  );
  expect(screen.getByText("Session Fee")).toBeInTheDocument();
  expect(screen.getByText("PAY-SESS-1")).toBeInTheDocument();
  expect(screen.getByText("₦15,000")).toBeInTheDocument();
});

it("hides empty obligation cards and shows all caught up when ₦0 is due", () => {
  render(
    <FinancialOverview
      credits={{ total_balance_ngn: 0 }}
      wallet={{ status: "active", balance: 147, available_balance: 147 }}
      serverOverview={{
        complete: true,
        due_kobo: 0,
        upcoming_kobo: 0,
        checking_kobo: 0,
        items: [],
        unpriced: [],
        optional_purchases: [],
        sources_unavailable: [],
        as_of: "2026-11-25T18:00:00Z",
      }}
      incomplete={false}
      hasPendingTransfers={false}
      onRefresh={() => {}}
      refreshing={false}
    />
  );
  expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
  expect(screen.queryByText(/Nothing here right now/i)).not.toBeInTheDocument();
  expect(screen.queryByText("Needs payment")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Check pending bank transfers/i })).not.toBeInTheDocument();
});
