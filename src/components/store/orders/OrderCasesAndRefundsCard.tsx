"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import {
  caseStatusMeta,
  caseTypeLabel,
  formatKobo,
  formatNaira,
  refundStatusMeta,
  resolutionLabel,
  type OrderCase,
  type OrderRefundSummary,
} from "@/lib/storeOrderLifecycle";
import { CheckCircle2, Clock, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  orderNumber: string;
  cases: OrderCase[];
  refunds: OrderRefundSummary[];
  onUpdated: () => void;
}

export function OrderCasesAndRefundsCard({ orderNumber, cases, refunds, onUpdated }: Props) {
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  if (cases.length === 0 && refunds.length === 0) return null;

  const handleWithdraw = async (caseId: string) => {
    setWithdrawingId(caseId);
    try {
      await apiPost(`/api/v1/store/orders/${orderNumber}/cases/${caseId}/withdraw`, {}, { auth: true });
      toast.success("Request withdrawn");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not withdraw request");
    } finally {
      setWithdrawingId(null);
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-cyan-600" />
        <h2 className="text-lg font-semibold text-slate-900">Requests &amp; Refunds</h2>
      </div>

      {cases.length > 0 && (
        <div className="space-y-3">
          {cases.map((c) => {
            const st = caseStatusMeta(c.status);
            const rSt = c.refund_status ? refundStatusMeta(c.refund_status) : null;
            return (
              <div
                key={c.id}
                className="rounded-lg border border-slate-200 p-4 space-y-2 bg-slate-50/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900">{c.case_number}</span>
                    <span className="text-xs text-slate-500">• {caseTypeLabel(c.case_type)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${st.className}`}>
                      {st.label}
                    </span>
                    {rSt && (
                      <span
                        className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${rSt.className}`}
                      >
                        {rSt.label}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Submitted{" "}
                  {new Date(c.created_at).toLocaleDateString("en-NG", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  • Outcome: {resolutionLabel(c.approved_resolution || c.preferred_resolution)}
                </p>

                {c.customer_notes && (
                  <p className="text-sm text-slate-700">Your note: {c.customer_notes}</p>
                )}

                {c.admin_notes && (
                  <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-2.5">
                    <span className="font-medium text-slate-900">SwimBuddz update: </span>
                    {c.admin_notes}
                  </p>
                )}

                {(Number(c.approved_refund_cash_ngn) > 0 ||
                  c.approved_refund_bubbles > 0 ||
                  Number(c.approved_refund_store_credit_ngn) > 0) && (
                  <div className="flex flex-wrap gap-3 text-xs text-slate-700 pt-1">
                    {Number(c.approved_refund_cash_ngn) > 0 && (
                      <span>
                        Cash: <strong>{formatNaira(c.approved_refund_cash_ngn)}</strong>
                      </span>
                    )}
                    {c.approved_refund_bubbles > 0 && (
                      <span>
                        Bubbles: <strong>{c.approved_refund_bubbles} 🫧</strong>
                      </span>
                    )}
                    {Number(c.approved_refund_store_credit_ngn) > 0 && (
                      <span>
                        Store Credit:{" "}
                        <strong>{formatNaira(c.approved_refund_store_credit_ngn)}</strong>
                      </span>
                    )}
                    {c.refund_reference && (
                      <span className="text-slate-500">Ref: {c.refund_reference}</span>
                    )}
                  </div>
                )}

                {c.status === "submitted" && (
                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleWithdraw(c.id)}
                      disabled={withdrawingId === c.id}
                    >
                      {withdrawingId === c.id ? "Withdrawing..." : "Withdraw Request"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <h3 className="text-sm font-semibold text-slate-800">Refund Payout Tracker</h3>
          {refunds.map((r) => {
            const st = refundStatusMeta(r.status);
            return (
              <div
                key={r.refund_reference}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  {r.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-cyan-600" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{r.refund_reference}</p>
                    <p className="text-xs text-slate-500">
                      {r.cash_refund_kobo > 0 && `Cash ${formatKobo(r.cash_refund_kobo)}`}
                      {r.bubbles_refund > 0 &&
                        `${r.cash_refund_kobo > 0 ? " • " : ""}${r.bubbles_refund} 🫧`}
                      {r.store_credit_refund_kobo > 0 &&
                        `${r.cash_refund_kobo > 0 || r.bubbles_refund > 0 ? " • " : ""}Store Credit ${formatKobo(r.store_credit_refund_kobo)}`}
                      {r.provider === "paystack" && r.status === "initiated" && (
                        <span> • Paystack typically credits banks in 3–10 working days</span>
                      )}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${st.className}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
