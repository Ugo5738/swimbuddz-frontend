"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { apiGet, apiPost } from "@/lib/api";
import {
  formatNaira,
  type OrderActionEligibility,
  type StoreOrderDetail,
  type StoreOrderItem,
} from "@/lib/storeOrderLifecycle";
import { AlertTriangle, RefreshCw, Repeat, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { OrderCaseModal, type OrderCaseModalMode } from "./OrderCaseModal";

interface ProductVariantOption {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price_ngn: number;
  in_stock: boolean;
  quantity_available?: number;
}

interface ProductDetailLookup {
  slug: string;
  name: string;
  base_price_ngn: number;
  variants: ProductVariantOption[];
}

interface Props {
  order: StoreOrderDetail;
  eligibility: OrderActionEligibility;
  onUpdated: () => void;
}

export function OrderManagePanel({ order, eligibility, onUpdated }: Props) {
  const [modalMode, setModalMode] = useState<null | "self_cancel" | "swap">(null);
  const [caseModalMode, setCaseModalMode] = useState<OrderCaseModalMode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Self-cancel form state
  const [reasonCode, setReasonCode] = useState("wrong_item_ordered");
  const [notes, setNotes] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  // Variant swap state
  const [swapItem, setSwapItem] = useState<StoreOrderItem | null>(null);
  const [swapCandidates, setSwapCandidates] = useState<ProductVariantOption[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedNewVariantId, setSelectedNewVariantId] = useState("");

  const hasAnyAction =
    eligibility.can_self_cancel_unpaid ||
    eligibility.can_self_cancel_paid ||
    eligibility.can_request_cancel ||
    eligibility.can_swap_variant ||
    eligibility.can_request_return_exchange ||
    eligibility.can_report_defect;

  const openSwapModal = async (item: StoreOrderItem) => {
    setNotes("");
    setSwapItem(item);
    setSwapCandidates([]);
    setSelectedNewVariantId("");
    setModalMode("swap");
    const slug = item.variant?.product?.slug;
    if (!slug) return;
    setLoadingVariants(true);
    try {
      const prod = await apiGet<ProductDetailLookup>(`/api/v1/store/products/${slug}`);
      const itemPrice = Number(item.unit_price_ngn);
      const eligible = (prod.variants || []).filter(
        (v) =>
          v.id !== item.variant_id &&
          v.in_stock &&
          Number(v.price_ngn ?? prod.base_price_ngn) === itemPrice
      );
      setSwapCandidates(eligible);
      if (eligible[0]) setSelectedNewVariantId(eligible[0].id);
    } catch {
      toast.error("Could not load available sizes/colors for this product.");
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleSelfCancel = async () => {
    setSubmitting(true);
    try {
      const res = await apiPost<{ message: string }>(
        `/api/v1/store/orders/${order.order_number}/cancel`,
        {
          reason_code: reasonCode,
          customer_notes: notes.trim() || undefined,
          recipient_bank_name: bankName.trim() || undefined,
          recipient_account_number: accountNumber.trim() || undefined,
          recipient_account_name: accountName.trim() || undefined,
        },
        { auth: true }
      );
      toast.success(res.message || "Order cancelled");
      setModalMode(null);
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwapVariant = async () => {
    if (!swapItem || !selectedNewVariantId) return;
    setSubmitting(true);
    try {
      await apiPost(
        `/api/v1/store/orders/${order.order_number}/swap-variant`,
        {
          order_item_id: swapItem.id,
          new_variant_id: selectedNewVariantId,
          customer_notes: notes.trim() || undefined,
        },
        { auth: true }
      );
      toast.success("Order item updated!");
      setModalMode(null);
      setNotes("");
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change variant");
    } finally {
      setSubmitting(false);
    }
  };

  const preview = eligibility.full_cancel_refund_preview;
  const needsBankDetailsHint =
    preview.cash_refund_ngn > 0 && preview.payment_method === "manual_transfer";

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Manage Your Order</h2>
        {eligibility.return_window_ends_at && eligibility.can_request_return_exchange && (
          <span className="text-xs font-medium text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full">
            Return window open until{" "}
            {new Date(eligibility.return_window_ends_at).toLocaleDateString("en-NG", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      {eligibility.policy_notes.length > 0 && (
        <div className="space-y-1.5">
          {eligibility.policy_notes.map((note, idx) => (
            <p key={idx} className="text-xs text-slate-600 leading-relaxed">
              • {note}
            </p>
          ))}
        </div>
      )}

      {hasAnyAction ? (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {eligibility.can_swap_variant && order.items[0] && (
            <Button variant="secondary" size="sm" onClick={() => openSwapModal(order.items[0])}>
              <Repeat className="w-4 h-4 mr-1.5" />
              Change Size / Color
            </Button>
          )}

          {(eligibility.can_self_cancel_unpaid || eligibility.can_self_cancel_paid) && (
            <Button
              variant="secondary"
              size="sm"
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
              onClick={() => {
                setReasonCode("wrong_item_ordered");
                setNotes("");
                setModalMode("self_cancel");
              }}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Cancel Order
            </Button>
          )}

          {eligibility.can_request_cancel && (
            <Button
              variant="secondary"
              size="sm"
              className="text-amber-800 border-amber-200 hover:bg-amber-50"
              onClick={() => setCaseModalMode("cancel_request")}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Request Cancellation
            </Button>
          )}

          {eligibility.can_request_return_exchange && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCaseModalMode("return_exchange")}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Return or Exchange
            </Button>
          )}

          {eligibility.can_report_defect && (
            <Button
              variant="secondary"
              size="sm"
              className="text-rose-700 border-rose-200 hover:bg-rose-50"
              onClick={() => setCaseModalMode("defect_claim")}
            >
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Report Defective / Wrong Item
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          {eligibility.has_open_case
            ? "You already have an active request on this order. Track its status below."
            : eligibility.cancel_block_reason ||
              "No self-service changes are available for this order right now."}
        </p>
      )}

      {/* Modal 1: Instant Self-Cancel */}
      <Modal
        isOpen={modalMode === "self_cancel"}
        onClose={() => setModalMode(null)}
        title={`Cancel Order #${order.order_number}`}
      >
        <div className="space-y-4">
          {eligibility.can_self_cancel_paid ? (
            <Alert variant="info" title="Full Refund Breakdown">
              <div className="space-y-1">
                {preview.cash_refund_ngn > 0 && (
                  <p>
                    Cash refund: <strong>{formatNaira(preview.cash_refund_ngn)}</strong>{" "}
                    {preview.payment_method === "manual_transfer"
                      ? "(bank transfer — target 2 business days)"
                      : "(returned via Paystack — banks typically credit in 3–10 working days)"}
                  </p>
                )}
                {preview.bubbles_refund > 0 && (
                  <p>
                    Bubbles restored: <strong>{preview.bubbles_refund} 🫧</strong> (instant)
                  </p>
                )}
                {preview.store_credit_refund_ngn > 0 && (
                  <p>
                    Store Credit restored:{" "}
                    <strong>{formatNaira(preview.store_credit_refund_ngn)}</strong> (instant)
                  </p>
                )}
              </div>
            </Alert>
          ) : (
            <Alert variant="info">
              This unpaid order will be cancelled immediately and any reserved stock, Store Credit,
              or held Bubbles will be released.
            </Alert>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="wrong_item_ordered">Selected the wrong item</option>
              <option value="wrong_size">Selected the wrong size or color</option>
              <option value="duplicate_order">Duplicate order</option>
              <option value="changed_mind">Changed my mind</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything helpful for our team..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {needsBankDetailsHint && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50">
              <p className="text-xs font-medium text-slate-700">
                Bank details for your transfer refund (optional — finance will verify NUBAN):
              </p>
              <input
                type="text"
                placeholder="Bank name (e.g., GTBank, Access Bank)"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
              />
              <input
                type="text"
                maxLength={10}
                placeholder="10-digit account number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
              />
              <input
                type="text"
                placeholder="Account holder name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm bg-white"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalMode(null)} disabled={submitting}>
              Keep Order
            </Button>
            <Button
              onClick={handleSelfCancel}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {submitting ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 2: Same-Price Variant Swap */}
      <Modal
        isOpen={modalMode === "swap"}
        onClose={() => setModalMode(null)}
        title="Change Size / Color (Same Price)"
      >
        <div className="space-y-4">
          {order.items.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Item</label>
              <select
                value={swapItem?.id ?? ""}
                onChange={(e) => {
                  const found = order.items.find((i) => i.id === e.target.value);
                  if (found) openSwapModal(found);
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {order.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.product_name} {item.variant_name ? `— ${item.variant_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loadingVariants ? (
            <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking available variants...
            </div>
          ) : swapCandidates.length === 0 ? (
            <Alert variant="info">
              No other in-stock size or color is available at the exact same price (
              {formatNaira(swapItem?.unit_price_ngn)}). You can cancel this order and place a new one
              instead.
            </Alert>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                New Size / Color
              </label>
              <select
                value={selectedNewVariantId}
                onChange={(e) => setSelectedNewVariantId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {swapCandidates.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name || v.sku} — {formatNaira(v.price_ngn)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalMode(null)} disabled={submitting}>
              Close
            </Button>
            {swapCandidates.length > 0 && (
              <Button
                onClick={handleSwapVariant}
                disabled={submitting || !selectedNewVariantId}
              >
                {submitting ? "Updating..." : "Save Change"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 3: Cancel Request / Return & Exchange / Defect Claim */}
      <OrderCaseModal
        mode={caseModalMode}
        onClose={() => setCaseModalMode(null)}
        order={order}
        eligibility={eligibility}
        onSubmitted={onUpdated}
      />
    </Card>
  );
}
