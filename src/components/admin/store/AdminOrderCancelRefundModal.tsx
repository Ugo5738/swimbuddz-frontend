"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { apiPost } from "@/lib/api";
import { formatNaira, type StoreOrderDetail } from "@/lib/storeOrderLifecycle";
import { useState } from "react";
import { toast } from "sonner";

interface AdminOrderCancelRefundModalProps {
  order: StoreOrderDetail;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminOrderCancelRefundModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: AdminOrderCancelRefundModalProps) {
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState("full_refund_original_method");
  const [includeDelivery, setIncludeDelivery] = useState(true);
  const [autoPaystack, setAutoPaystack] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (reason.trim().length < 3) {
      toast.error("Please enter a reason for cancellation.");
      return;
    }
    setSaving(true);
    try {
      await apiPost(
        `/api/v1/admin/store/orders/${order.id}/cancel-and-refund`,
        {
          reason: reason.trim(),
          resolution,
          include_delivery_fee: includeDelivery,
          auto_initiate_paystack: autoPaystack,
        },
        { auth: true }
      );
      toast.success("Order cancelled and refund workflow created");
      setReason("");
      onClose();
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel and refund order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancel & Refund Order #${order.order_number}`}
    >
      <div className="space-y-4">
        <Alert variant="info">
          This cancels the order, releases unfulfilled stock reservations, restores Store Credit
          and Bubbles, and creates an audited refund record in Payments (auto-initiating Paystack
          if enabled).
        </Alert>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Refund Channel</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="full_refund_original_method">
              Full Refund to Original Payment Method
            </option>
            <option value="store_credit">Store Credit</option>
            <option value="wallet_bubbles">Bubbles Wallet Credit</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeDelivery}
            onChange={(e) => setIncludeDelivery(e.target.checked)}
          />
          Include delivery fee ({formatNaira(order.delivery_fee_ngn)})
        </label>

        {resolution === "full_refund_original_method" && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={autoPaystack}
              onChange={(e) => setAutoPaystack(e.target.checked)}
            />
            Auto-initiate Paystack API refund immediately (if paid via Paystack)
          </label>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cancellation Reason (required)
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Out of stock on supplier reorder, customer requested cancel"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Close
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {saving ? "Processing..." : "Confirm Cancel & Refund"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
