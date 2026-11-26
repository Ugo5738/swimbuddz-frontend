"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiPost } from "@/lib/api";
import { uploadMedia } from "@/lib/media";
import type { OrderActionEligibility, StoreOrderDetail } from "@/lib/storeOrderLifecycle";
import { Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export type OrderCaseModalMode = "cancel_request" | "return_exchange" | "defect_claim";

interface Props {
  mode: OrderCaseModalMode | null;
  onClose: () => void;
  order: StoreOrderDetail;
  eligibility: OrderActionEligibility;
  onSubmitted: () => void;
}

export function OrderCaseModal({ mode, onClose, order, eligibility, onSubmitted }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reasonCode, setReasonCode] = useState("wrong_item_ordered");
  const [preferredResolution, setPreferredResolution] = useState("variant_exchange");
  const [selectedItemId, setSelectedItemId] = useState<string>(order.items[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [evidenceMediaIds, setEvidenceMediaIds] = useState<string[]>([]);

  useEffect(() => {
    if (!mode) return;
    setNotes("");
    setEvidenceMediaIds([]);
    setSelectedItemId(order.items[0]?.id ?? "");
    if (mode === "defect_claim") {
      setReasonCode("defective");
      setPreferredResolution("full_refund_original_method");
    } else if (mode === "return_exchange") {
      setReasonCode("wrong_size");
      setPreferredResolution("variant_exchange");
    } else {
      setReasonCode("wrong_item_ordered");
      setPreferredResolution("full_refund_original_method");
    }
  }, [mode, order.items]);

  const handleEvidenceUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const media = await uploadMedia(
        file,
        "general",
        order.id,
        `Order ${order.order_number} evidence`
      );
      setEvidenceMediaIds((prev) => [...prev, media.id]);
      toast.success("Photo attached");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!mode) return;
    setSubmitting(true);
    try {
      const selectedItem = order.items.find((i) => i.id === selectedItemId);
      await apiPost(
        `/api/v1/store/orders/${order.order_number}/cases`,
        {
          case_type: mode,
          reason_code: reasonCode,
          customer_notes: notes.trim() || undefined,
          evidence_media_ids: evidenceMediaIds,
          preferred_resolution:
            mode === "cancel_request" ? "full_refund_original_method" : preferredResolution,
          items:
            mode === "cancel_request"
              ? []
              : selectedItem
                ? [{ order_item_id: selectedItem.id, quantity: selectedItem.quantity }]
                : [],
        },
        { auth: true }
      );
      toast.success("Request submitted. Our team reviews within 1 business day.");
      onClose();
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === "cancel_request"
      ? "Request Order Cancellation"
      : mode === "return_exchange"
        ? "Return or Exchange (7-Day Window)"
        : "Report Defective or Wrong Item";

  return (
    <Modal isOpen={mode !== null} onClose={onClose} title={title}>
      <div className="space-y-4">
        {mode === "return_exchange" && (
          <Alert variant="info">
            Unused items returned within 7 days qualify for a{" "}
            <strong>size/color exchange, Store Credit, or Bubbles</strong>. Original delivery fee
            is non-refundable; you can drop items off at any SwimBuddz pool session for free.
            {eligibility.has_swimwear_items && (
              <p className="mt-1 font-medium">
                Swimwear must be unworn with hygiene seals and original tags intact.
              </p>
            )}
          </Alert>
        )}

        {mode === "defect_claim" && (
          <Alert variant="info">
            For defective, damaged, misdescribed, or incorrect items supplied, SwimBuddz offers a{" "}
            <strong>full refund to your original payment method (including delivery fee)</strong>{" "}
            or a <strong>free replacement</strong>. Please attach a clear photo to speed up review.
          </Alert>
        )}

        {mode !== "cancel_request" && order.items.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {order.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product_name} {item.variant_name ? `(${item.variant_name})` : ""} ×
                  {item.quantity}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            {mode === "defect_claim" ? (
              <>
                <option value="defective">Item is defective / faulty</option>
                <option value="damaged_in_transit">Arrived damaged</option>
                <option value="wrong_item_received">Received the wrong item or size</option>
                <option value="not_as_described">Item does not match description</option>
              </>
            ) : mode === "return_exchange" ? (
              <>
                <option value="wrong_size">Need a different size</option>
                <option value="wrong_color">Prefer a different color</option>
                <option value="changed_mind">Changed my mind (unused)</option>
              </>
            ) : (
              <>
                <option value="wrong_item_ordered">Selected the wrong item</option>
                <option value="delayed_preorder">Preorder timeline no longer works</option>
                <option value="changed_mind">No longer needed</option>
                <option value="other">Other</option>
              </>
            )}
          </select>
        </div>

        {mode !== "cancel_request" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Preferred Outcome
            </label>
            <select
              value={preferredResolution}
              onChange={(e) => setPreferredResolution(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              {mode === "return_exchange" ? (
                <>
                  <option value="variant_exchange">Exchange for another size / color</option>
                  <option value="store_credit">Store Credit (for future orders)</option>
                  <option value="wallet_bubbles">Bubbles Wallet Credit</option>
                </>
              ) : (
                <>
                  <option value="full_refund_original_method">
                    Full Refund to Original Payment Method
                  </option>
                  <option value="replacement_shipment">Free Replacement</option>
                  <option value="store_credit">Store Credit</option>
                </>
              )}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Details {mode === "defect_claim" ? "(recommended)" : "(optional)"}
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the size you need, defect observed, or pickup session preference..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        {(mode === "return_exchange" || mode === "defect_claim") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Photo Evidence (optional, up to 6)
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
              <Upload className="w-4 h-4 text-cyan-600" />
              <span>{uploading ? "Uploading..." : "Attach photo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading || evidenceMediaIds.length >= 6}
                onChange={(e) => handleEvidenceUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            {evidenceMediaIds.length > 0 && (
              <p className="text-xs text-emerald-700 mt-1">
                {evidenceMediaIds.length} photo(s) attached
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || uploading}>
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
