/** Shared typed contracts & presentation helpers for Store post-purchase lifecycle (ADR-024). */

export interface StoreOrderItem {
  id: string;
  variant_id: string;
  product_name: string;
  variant_name: string | null;
  sku: string;
  quantity: number;
  unit_price_ngn: number;
  line_total_ngn: number;
  net_line_total_ngn?: number | null;
  is_preorder?: boolean;
  sourcing_type?: string;
  requires_size_chart_ack?: boolean;
  variant?: {
    id: string;
    name: string | null;
    sku: string;
    options: Record<string, string>;
    product?: {
      id: string;
      name: string;
      slug: string;
      images?: { url: string; is_primary: boolean }[];
    };
  };
}

export interface StoreOrderDetail {
  id: string;
  order_number: string;
  status: string;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  fulfillment_type: string;
  subtotal_ngn: number;
  discount_amount_ngn: number;
  store_credit_applied_ngn?: number;
  delivery_fee_ngn: number;
  order_total_ngn?: number | null;
  cash_payable_ngn?: number | null;
  total_ngn: number;
  bubbles_applied?: number | null;
  discount_code: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  payment_reference?: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  fulfilled_at?: string | null;
  cancelled_at?: string | null;
  refunded_at?: string | null;
  items: StoreOrderItem[];
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  member_id?: string | null;
  pickup_location?: {
    id: string;
    name: string;
    address: string | null;
  };
  delivery_address?: {
    street: string;
    city: string;
    state: string;
    phone: string;
  };
  delivery_notes?: string | null;
  tracking_number?: string;
  tracking_url?: string;
}

export interface OrderCaseItem {
  id: string;
  order_item_id: string;
  quantity: number;
  replacement_variant_id?: string | null;
  product_name?: string | null;
  variant_name?: string | null;
  sku?: string | null;
  unit_price_ngn?: number | null;
}

export interface OrderCase {
  id: string;
  case_number: string;
  order_id: string;
  order_number?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  case_type: "cancel_request" | "variant_swap" | "return_exchange" | "defect_claim";
  status:
    | "submitted"
    | "under_review"
    | "approved"
    | "declined"
    | "awaiting_return"
    | "return_received"
    | "completed"
    | "cancelled";
  reason_code: string;
  customer_notes?: string | null;
  evidence_media_ids: string[];
  preferred_resolution?: string | null;
  approved_resolution?: string | null;
  requested_variant_id?: string | null;
  approved_refund_cash_ngn: number;
  approved_refund_bubbles: number;
  approved_refund_store_credit_ngn: number;
  delivery_fee_refunded: boolean;
  refund_reference?: string | null;
  refund_status?: string | null;
  recipient_bank_code?: string | null;
  recipient_bank_name?: string | null;
  recipient_account_number?: string | null;
  recipient_account_name?: string | null;
  return_condition: "pending" | "restockable" | "damaged" | "hygiene_unsellable";
  return_received_at?: string | null;
  restocked_at?: string | null;
  is_policy_override: boolean;
  override_reason?: string | null;
  admin_notes?: string | null;
  reviewed_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderCaseItem[];
}

export interface OrderRefundSummary {
  refund_reference: string;
  status: string;
  refund_method: string;
  provider?: string | null;
  cash_refund_kobo: number;
  bubbles_refund: number;
  store_credit_refund_kobo: number;
  provider_refund_id?: string | null;
  external_bank_reference?: string | null;
  failure_reason?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface OrderRefundPreview {
  cash_refund_ngn: number;
  bubbles_refund: number;
  store_credit_refund_ngn: number;
  total_refund_value_ngn: number;
  delivery_fee_included: boolean;
  payment_method?: string | null;
}

export interface OrderActionEligibility {
  order_number: string;
  payment_status: string;
  fulfillment_status: string;
  can_self_cancel_unpaid: boolean;
  can_self_cancel_paid: boolean;
  can_request_cancel: boolean;
  can_swap_variant: boolean;
  can_request_return_exchange: boolean;
  can_report_defect: boolean;
  has_preorder_or_dropship: boolean;
  has_swimwear_items: boolean;
  has_open_case: boolean;
  payment_pending_review: boolean;
  return_window_ends_at?: string | null;
  cancel_block_reason?: string | null;
  policy_notes: string[];
  full_cancel_refund_preview: OrderRefundPreview;
  cases: OrderCase[];
  refunds: OrderRefundSummary[];
}

export interface AdminRefundRecord {
  id: string;
  refund_reference: string;
  idempotency_key: string;
  payment_id?: string | null;
  payment_reference?: string | null;
  member_auth_id: string;
  payer_email?: string | null;
  source_service: string;
  source_entity_type: string;
  source_entity_id: string;
  purpose: string;
  currency: string;
  requested_total_kobo: number;
  cash_refund_kobo: number;
  bubbles_refund: number;
  store_credit_refund_kobo: number;
  refund_method: string;
  status: "requested" | "approved" | "initiated" | "completed" | "failed" | "cancelled";
  reason?: string | null;
  admin_note?: string | null;
  override_reason?: string | null;
  provider?: string | null;
  provider_refund_id?: string | null;
  provider_status?: string | null;
  external_bank_reference?: string | null;
  recipient_bank_code?: string | null;
  recipient_bank_name?: string | null;
  recipient_account_number?: string | null;
  recipient_account_name?: string | null;
  recipient_account_verified: boolean;
  ledger_accrual_posted: boolean;
  ledger_disbursement_posted: boolean;
  failure_reason?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface AdminRefundListResponse {
  items: AdminRefundRecord[];
  total: number;
  page: number;
  page_size: number;
  pending_cash_kobo: number;
  initiated_cash_kobo: number;
  completed_cash_kobo: number;
}

export interface NigerianBankOption {
  name: string;
  code: string;
  slug: string;
}

export function formatNaira(amount: number | string | null | undefined): string {
  const num = Number(amount ?? 0);
  return `₦${num.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}

export function formatKobo(kobo: number | null | undefined): string {
  return formatNaira(Number(kobo ?? 0) / 100);
}

export function effectiveOrderTotal(order: {
  order_total_ngn?: number | null;
  subtotal_ngn: number;
  discount_amount_ngn: number;
  delivery_fee_ngn: number;
}): number {
  if (order.order_total_ngn !== undefined && order.order_total_ngn !== null) {
    return Number(order.order_total_ngn);
  }
  return Math.max(
    0,
    Number(order.subtotal_ngn || 0) -
      Number(order.discount_amount_ngn || 0) +
      Number(order.delivery_fee_ngn || 0)
  );
}

export function paymentStatusMeta(status?: string | null): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    unpaid: { label: "Unpaid", className: "bg-amber-100 text-amber-800" },
    pending_review: { label: "Transfer Under Review", className: "bg-amber-100 text-amber-800" },
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
    partially_refunded: { label: "Partially Refunded", className: "bg-purple-100 text-purple-800" },
    refunded: { label: "Refunded", className: "bg-slate-200 text-slate-800" },
    failed: { label: "Payment Failed", className: "bg-rose-100 text-rose-800" },
  };
  return map[status ?? ""] ?? { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
}

export function fulfillmentStatusMeta(status?: string | null): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    not_started: { label: "Not Started", className: "bg-slate-100 text-slate-700" },
    awaiting_preparation: { label: "Awaiting Preparation", className: "bg-blue-100 text-blue-800" },
    processing: { label: "Being Prepared", className: "bg-indigo-100 text-indigo-800" },
    ready_for_pickup: { label: "Ready for Pickup", className: "bg-emerald-100 text-emerald-800" },
    picked_up: { label: "Picked Up", className: "bg-emerald-100 text-emerald-800" },
    shipped: { label: "Shipped", className: "bg-cyan-100 text-cyan-800" },
    delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-800" },
    cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-800" },
    returned: { label: "Returned", className: "bg-purple-100 text-purple-800" },
  };
  return map[status ?? ""] ?? { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
}

export function caseStatusMeta(status: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    submitted: { label: "Submitted", className: "bg-amber-100 text-amber-800" },
    under_review: { label: "Under Review", className: "bg-blue-100 text-blue-800" },
    approved: { label: "Approved", className: "bg-cyan-100 text-cyan-800" },
    awaiting_return: { label: "Awaiting Return", className: "bg-purple-100 text-purple-800" },
    return_received: { label: "Return Received", className: "bg-indigo-100 text-indigo-800" },
    completed: { label: "Completed", className: "bg-emerald-100 text-emerald-800" },
    declined: { label: "Declined", className: "bg-rose-100 text-rose-800" },
    cancelled: { label: "Withdrawn", className: "bg-slate-100 text-slate-600" },
  };
  return map[status] ?? { label: status, className: "bg-slate-100 text-slate-700" };
}

export function refundStatusMeta(status?: string | null): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    requested: { label: "Refund Requested", className: "bg-amber-100 text-amber-800" },
    approved: { label: "Refund Approved", className: "bg-blue-100 text-blue-800" },
    initiated: { label: "Refund Processing", className: "bg-cyan-100 text-cyan-800" },
    completed: { label: "Refund Completed", className: "bg-emerald-100 text-emerald-800" },
    failed: { label: "Refund Needs Attention", className: "bg-rose-100 text-rose-800" },
    cancelled: { label: "Refund Cancelled", className: "bg-slate-100 text-slate-600" },
  };
  return map[status ?? ""] ?? { label: status || "Pending", className: "bg-slate-100 text-slate-700" };
}

export function caseTypeLabel(caseType: string): string {
  const map: Record<string, string> = {
    cancel_request: "Cancellation",
    variant_swap: "Size / Color Swap",
    return_exchange: "Return / Exchange",
    defect_claim: "Defect / Wrong Item Claim",
  };
  return map[caseType] ?? caseType.replace(/_/g, " ");
}

export function resolutionLabel(resolution?: string | null): string {
  const map: Record<string, string> = {
    full_refund_original_method: "Full Refund (Original Payment Method)",
    partial_refund_original_method: "Partial Refund (Original Payment Method)",
    variant_exchange: "Size / Color Exchange",
    store_credit: "Store Credit",
    wallet_bubbles: "Bubbles Wallet Credit",
    replacement_shipment: "Free Replacement",
    no_refund: "No Refund",
  };
  return map[resolution ?? ""] ?? (resolution ? resolution.replace(/_/g, " ") : "—");
}
