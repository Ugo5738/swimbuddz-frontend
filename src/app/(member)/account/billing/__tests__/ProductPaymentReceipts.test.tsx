import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
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
