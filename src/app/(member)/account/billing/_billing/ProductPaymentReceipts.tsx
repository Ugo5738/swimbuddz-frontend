import { Card } from "@/components/ui/Card";
import type { PaymentRecord } from "../types";
import { formatCurrency, formatDate } from "../utils";

const PURPOSE_LABELS: Record<string, string> = {
  community: "Annual Membership",
  community_annual: "Annual Membership",
  club: "Club Plan",
  club_bundle: "Club + Annual Membership",
  academy_cohort: "Academy Cohort",
  session_fee: "Session Fee",
  session_bundle: "Session Bundle",
  community_experience: "Community Experience",
  store_order: "Swim Store Order",
};

const METHOD_LABELS: Record<string, string> = {
  paystack: "Paystack",
  manual_transfer: "Bank transfer",
  wallet: "Bubbles Wallet",
  bubbles: "Bubbles Wallet",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending_review: { label: "Under review", className: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800 border-amber-200" },
  failed: { label: "Failed", className: "bg-rose-50 text-rose-700 border-rose-200" },
  refunded: { label: "Refunded", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

function purposeLabel(purpose?: string | null): string {
  if (!purpose) return "Payment";
  const key = purpose.toLowerCase();
  if (PURPOSE_LABELS[key]) return PURPOSE_LABELS[key];
  return purpose.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function methodLabel(method?: string | null): string | null {
  if (!method) return null;
  const key = method.toLowerCase();
  return METHOD_LABELS[key] ?? method.replace(/_/g, " ");
}

export function ProductPaymentReceipts({ payments }: { payments: PaymentRecord[] }) {
  if (!payments.length) {
    return (
      <Card className="p-6 text-center bg-slate-50 border-dashed">
        <p className="text-sm font-medium text-slate-700">No payments recorded yet.</p>
        <p className="mt-1 text-xs text-slate-500">
          Your membership, session, academy, and transfer receipts will appear here.
        </p>
      </Card>
    );
  }

  const sorted = [...payments].sort(
    (a, b) =>
      new Date(b.paid_at || b.created_at).getTime() -
      new Date(a.paid_at || a.created_at).getTime()
  );

  const money = (kobo: number) => formatCurrency(kobo / 100);

  return (
    <Card className="p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Payment history &amp; receipts
        </h2>
        <p className="mt-1 text-xs text-slate-500 md:text-sm">
          All recorded payments in chronological order. Expand itemized receipts to see original
          price, discounts, and Bubbles used.
        </p>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {sorted.map((payment) => {
          const quote = payment.payment_metadata?.checkout_quote;
          const badge = STATUS_BADGES[payment.status?.toLowerCase()] ?? {
            label: payment.status || "Recorded",
            className: "bg-slate-100 text-slate-700 border-slate-200",
          };
          const method = methodLabel(payment.payment_method);
          const dateStr = formatDate(payment.paid_at || payment.created_at);
          const title = purposeLabel(payment.purpose);

          if (quote) {
            return (
              <details key={payment.reference} className="py-3.5 group">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{title}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {dateStr}
                      {method ? ` · ${method}` : ""} · {money(quote.total_kobo)} cash
                      {quote.bubbles_to_apply ? ` + ${quote.bubbles_to_apply} Bubbles` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-cyan-700 group-open:underline">
                    View receipt
                  </span>
                </summary>
                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:text-sm">
                  <dt className="text-slate-500">Original price</dt>
                  <dd className="font-medium text-slate-900">{money(quote.subtotal_kobo)}</dd>
                  <dt className="text-slate-500">Discount</dt>
                  <dd className="font-medium text-slate-900">−{money(quote.discount_kobo)}</dd>
                  <dt className="text-slate-500">Bubbles paid</dt>
                  <dd className="font-medium text-slate-900">{quote.bubbles_to_apply}</dd>
                  <dt className="text-slate-500">Processing charges</dt>
                  <dd className="font-medium text-slate-900">
                    {money(quote.additional_charges_total_kobo)}
                  </dd>
                  <dt className="text-slate-500">Cash paid (including charges)</dt>
                  <dd className="font-semibold text-slate-900">{money(quote.total_kobo)}</dd>
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="break-all font-mono text-xs text-slate-700">
                    {payment.reference}
                  </dd>
                </dl>
                {payment.status === "paid" && !payment.entitlement_applied_at && (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Payment received; access activation is processing. Do not pay again.
                  </p>
                )}
              </details>
            );
          }

          return (
            <div
              key={payment.id || payment.reference}
              className="flex flex-wrap items-center justify-between gap-3 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {dateStr}
                  {method ? ` · ${method}` : ""} · Ref{" "}
                  <span className="font-mono">{payment.reference}</span>
                </p>
                {payment.status === "paid" && !payment.entitlement_applied_at && (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    Payment received; access activation is processing. Do not pay again.
                  </p>
                )}
              </div>
              <span className="text-sm font-bold tabular-nums text-slate-900">
                {formatCurrency(payment.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
