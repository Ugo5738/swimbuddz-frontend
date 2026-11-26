"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
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
import { CheckCircle2, ClipboardCheck, PackageCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  cases: OrderCase[];
  refunds?: OrderRefundSummary[];
  onUpdated: () => void;
  showOrderLinks?: boolean;
}

export function AdminOrderCasesSection({
  cases,
  refunds = [],
  onUpdated,
  showOrderLinks = false,
}: Props) {
  const [reviewCase, setReviewCase] = useState<OrderCase | null>(null);
  const [receiveCase, setReceiveCase] = useState<OrderCase | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Review modal state
  const [decision, setDecision] = useState<"approve" | "decline">("approve");
  const [approvedResolution, setApprovedResolution] = useState("full_refund_original_method");
  const [requireReturn, setRequireReturn] = useState(true);
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [autoPaystack, setAutoPaystack] = useState(true);
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Return inspection modal state
  const [returnCondition, setReturnCondition] = useState<
    "restockable" | "damaged" | "hygiene_unsellable"
  >("restockable");
  const [returnNotes, setReturnNotes] = useState("");

  const openReview = (c: OrderCase) => {
    setReviewCase(c);
    setDecision("approve");
    setApprovedResolution(
      c.preferred_resolution ||
        (c.case_type === "return_exchange" ? "store_credit" : "full_refund_original_method")
    );
    setRequireReturn(c.case_type === "return_exchange");
    setIncludeDelivery(c.case_type === "defect_claim" || c.case_type === "cancel_request");
    setAutoPaystack(true);
    setIsOverride(false);
    setOverrideReason("");
    setAdminNotes("");
  };

  const openReceive = (c: OrderCase) => {
    setReceiveCase(c);
    setReturnCondition("restockable");
    setReturnNotes("");
  };

  const submitReview = async () => {
    if (!reviewCase) return;
    setSubmitting(true);
    try {
      await apiPost(
        `/api/v1/admin/store/cases/${reviewCase.id}/review`,
        {
          decision,
          approved_resolution: decision === "approve" ? approvedResolution : undefined,
          require_return_before_resolution:
            decision === "approve" && reviewCase.case_type !== "cancel_request"
              ? requireReturn
              : false,
          include_delivery_fee: includeDelivery,
          auto_initiate_paystack: autoPaystack,
          is_policy_override: isOverride,
          override_reason: isOverride ? overrideReason.trim() : undefined,
          admin_notes: adminNotes.trim() || undefined,
        },
        { auth: true }
      );
      toast.success(decision === "approve" ? "Case approved" : "Case declined");
      setReviewCase(null);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review case");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReceiveReturn = async () => {
    if (!receiveCase) return;
    setSubmitting(true);
    try {
      await apiPost(
        `/api/v1/admin/store/cases/${receiveCase.id}/receive-return`,
        {
          return_condition: returnCondition,
          admin_notes: returnNotes.trim() || undefined,
          include_delivery_fee: receiveCase.case_type === "defect_claim",
          auto_initiate_paystack: true,
        },
        { auth: true }
      );
      toast.success("Return recorded and resolution executed");
      setReceiveCase(null);
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record return");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {cases.length === 0 ? (
        <p className="text-sm text-slate-500">No post-purchase requests on this order.</p>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => {
            const st = caseStatusMeta(c.status);
            const rSt = c.refund_status ? refundStatusMeta(c.refund_status) : null;
            return (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.case_number}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {caseTypeLabel(c.case_type)}
                      </span>
                      {showOrderLinks && c.order_number && (
                        <Link
                          href={`/admin/store/orders/${c.order_id}`}
                          className="text-xs font-medium text-cyan-600 hover:underline"
                        >
                          Order #{c.order_number}
                        </Link>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {c.customer_name && `${c.customer_name} • `}
                      Reason: <span className="font-medium">{c.reason_code.replace(/_/g, " ")}</span>{" "}
                      • {new Date(c.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${st.className}`}>
                      {st.label}
                    </span>
                    {rSt && (
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${rSt.className}`}>
                        {rSt.label}
                      </span>
                    )}
                  </div>
                </div>

                {c.customer_notes && (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-md p-2.5">
                    <span className="font-medium">Customer:</span> {c.customer_notes}
                  </p>
                )}

                {c.items.length > 0 && (
                  <div className="text-xs text-slate-600">
                    Items:{" "}
                    {c.items
                      .map((it) => `${it.product_name || "Item"} (${it.sku || ""}) ×${it.quantity}`)
                      .join(", ")}
                  </div>
                )}

                {c.evidence_media_ids.length > 0 && (
                  <p className="text-xs text-cyan-700">
                    📎 {c.evidence_media_ids.length} photo evidence item(s) attached
                  </p>
                )}

                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>
                    Outcome:{" "}
                    <strong>{resolutionLabel(c.approved_resolution || c.preferred_resolution)}</strong>
                  </span>
                  {Number(c.approved_refund_cash_ngn) > 0 && (
                    <span>Cash: {formatNaira(c.approved_refund_cash_ngn)}</span>
                  )}
                  {c.approved_refund_bubbles > 0 && (
                    <span>Bubbles: {c.approved_refund_bubbles} 🫧</span>
                  )}
                  {Number(c.approved_refund_store_credit_ngn) > 0 && (
                    <span>Store Credit: {formatNaira(c.approved_refund_store_credit_ngn)}</span>
                  )}
                  {c.refund_reference && (
                    <Link
                      href="/admin/payments?tab=refunds"
                      className="text-cyan-600 hover:underline font-medium"
                    >
                      Refund {c.refund_reference} →
                    </Link>
                  )}
                </div>

                {c.is_policy_override && c.override_reason && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                    Policy override: {c.override_reason}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {(c.status === "submitted" || c.status === "under_review") && (
                    <Button size="sm" onClick={() => openReview(c)}>
                      <ClipboardCheck className="w-4 h-4 mr-1.5" />
                      Review Request
                    </Button>
                  )}
                  {c.status === "awaiting_return" && (
                    <Button size="sm" onClick={() => openReceive(c)}>
                      <PackageCheck className="w-4 h-4 mr-1.5" />
                      Record Return &amp; Inspect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {refunds.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Linked Refunds</h3>
            <Link href="/admin/payments?tab=refunds" className="text-xs text-cyan-600 hover:underline">
              Manage in Payments →
            </Link>
          </div>
          {refunds.map((r) => {
            const st = refundStatusMeta(r.status);
            return (
              <div
                key={r.refund_reference}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{r.refund_reference}</span>
                  <span className="text-slate-500 ml-2">
                    Cash {formatKobo(r.cash_refund_kobo)}
                    {r.bubbles_refund > 0 && ` • ${r.bubbles_refund} 🫧`}
                    {r.store_credit_refund_kobo > 0 &&
                      ` • Credit ${formatKobo(r.store_credit_refund_kobo)}`}
                    {r.provider && ` • ${r.provider}`}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full font-medium ${st.className}`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewCase}
        onClose={() => setReviewCase(null)}
        title={reviewCase ? `Review ${reviewCase.case_number}` : "Review Case"}
      >
        {reviewCase && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={decision === "approve" ? "primary" : "secondary"}
                onClick={() => setDecision("approve")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant={decision === "decline" ? "primary" : "secondary"}
                className={decision === "decline" ? "bg-rose-600 hover:bg-rose-700" : ""}
                onClick={() => setDecision("decline")}
              >
                <ShieldAlert className="w-4 h-4 mr-1.5" />
                Decline
              </Button>
            </div>

            {decision === "approve" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Approved Resolution
                  </label>
                  <select
                    value={approvedResolution}
                    onChange={(e) => setApprovedResolution(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="full_refund_original_method">
                      Full Refund (Original Payment Method)
                    </option>
                    <option value="variant_exchange">Size / Color Exchange</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="wallet_bubbles">Bubbles Wallet Credit</option>
                    <option value="replacement_shipment">Free Replacement</option>
                  </select>
                </div>

                {reviewCase.case_type !== "cancel_request" && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={requireReturn}
                      onChange={(e) => setRequireReturn(e.target.checked)}
                    />
                    Require physical item return &amp; inspection before releasing refund/credit
                  </label>
                )}

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={autoPaystack}
                    onChange={(e) => setAutoPaystack(e.target.checked)}
                  />
                  Auto-initiate Paystack API refund immediately (if paid via Paystack)
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeDelivery}
                    onChange={(e) => setIncludeDelivery(e.target.checked)}
                  />
                  Include original delivery fee in refund
                </label>

                <label className="flex items-center gap-2 text-sm text-amber-800">
                  <input
                    type="checkbox"
                    checked={isOverride}
                    onChange={(e) => setIsOverride(e.target.checked)}
                  />
                  Policy override (requires audit justification)
                </label>

                {isOverride && (
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Why are you overriding normal store policy?"
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  />
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin Notes {decision === "decline" ? "(required — shown to customer)" : "(optional)"}
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain the decision or next steps..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReviewCase(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitReview} disabled={submitting}>
                {submitting ? "Saving..." : "Submit Decision"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return Inspection Modal */}
      <Modal
        isOpen={!!receiveCase}
        onClose={() => setReceiveCase(null)}
        title={receiveCase ? `Inspect Return — ${receiveCase.case_number}` : "Inspect Return"}
      >
        {receiveCase && (
          <div className="space-y-4">
            <Alert variant="info">
              Only items marked <strong>Restockable</strong> return to sellable inventory and
              reverse COGS. Damaged or hygiene-unsealed swimwear will NOT be restocked.
            </Alert>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Physical Inspection Condition
              </label>
              <select
                value={returnCondition}
                onChange={(e) =>
                  setReturnCondition(
                    e.target.value as "restockable" | "damaged" | "hygiene_unsellable"
                  )
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                <option value="restockable">Restockable (unused, tags &amp; seals intact)</option>
                <option value="damaged">Damaged / Defective (do not restock)</option>
                <option value="hygiene_unsellable">
                  Hygiene Unsellable / Seal Broken (do not restock)
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Inspection Notes
              </label>
              <textarea
                rows={2}
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="e.g., Received at Yaba Saturday session, seal intact"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReceiveCase(null)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={submitReceiveReturn} disabled={submitting}>
                {submitting ? "Processing..." : "Confirm Return & Execute Remedy"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
