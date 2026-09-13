import { Card } from "@/components/ui/Card";
import type { PaymentRecord } from "../types";
import { formatCurrency, formatDate } from "../utils";

const labels: Record<string, string> = {
  community: "Annual Membership",
  club: "Club",
  club_bundle: "Club + Membership",
  academy_cohort: "Academy",
  community_experience: "Community Experience",
};

export function ProductPaymentReceipts({ payments }: { payments: PaymentRecord[] }) {
  const receipts = payments.filter(
    (payment) => payment.status === "paid" && payment.payment_metadata?.checkout_quote
  );
  if (!receipts.length) return null;
  return (
    <Card>
      <h2 className="text-lg font-semibold">Payment receipts</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your agreed price, discount and payment methods are recorded separately.
      </p>
      <div className="mt-3 divide-y divide-slate-100">
        {receipts.map((payment) => {
          const quote = payment.payment_metadata!.checkout_quote!;
          const money = (kobo: number) => formatCurrency(kobo / 100);
          return (
            <details key={payment.reference} className="py-3">
              <summary className="cursor-pointer text-sm font-medium">
                {labels[payment.purpose || ""] || "Payment"} ·{" "}
                {formatDate(payment.paid_at || payment.created_at)} · {money(quote.total_kobo)} cash
                {quote.bubbles_to_apply ? ` + ${quote.bubbles_to_apply} Bubbles` : ""}
              </summary>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <dt>Original price</dt>
                <dd>{money(quote.subtotal_kobo)}</dd>
                <dt>Discount</dt>
                <dd>−{money(quote.discount_kobo)}</dd>
                <dt>Bubbles paid</dt>
                <dd>{quote.bubbles_to_apply}</dd>
                <dt>Processing charges</dt>
                <dd>{money(quote.additional_charges_total_kobo)}</dd>
                <dt>Cash paid (including charges)</dt>
                <dd>{money(quote.total_kobo)}</dd>
                <dt>Reference</dt>
                <dd className="break-all">{payment.reference}</dd>
              </dl>
              {!payment.entitlement_applied_at && (
                <p className="mt-2 text-sm text-amber-700">
                  Payment received; access activation is processing. Do not pay again.
                </p>
              )}
            </details>
          );
        })}
      </div>
    </Card>
  );
}
