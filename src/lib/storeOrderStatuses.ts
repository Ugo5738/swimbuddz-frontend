/** Store admin status choices are operational, not proof that funds cleared. */
export const STORE_ORDER_STATUSES = [
  "pending_payment",
  "payment_failed",
  "paid",
  "processing",
  "ready_for_pickup",
  "picked_up",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const allowedTransitions: Record<string, string[]> = {
  pending_payment: ["cancelled"],
  payment_failed: ["cancelled"],
  // Paid orders cannot be silently cancelled via the raw status dropdown (ADR-024);
  // admins use "Cancel & Issue Refund" or approve a cancellation case instead.
  paid: ["processing"],
  processing: ["ready_for_pickup", "shipped"],
  ready_for_pickup: ["picked_up"],
  shipped: ["delivered"],
  picked_up: [],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function allowedStoreOrderStatuses(
  current: string,
  fulfillmentType?: string | null
): string[] {
  if (current === "processing") {
    if (fulfillmentType === "pickup") {
      return [current, "ready_for_pickup"];
    }
    if (fulfillmentType === "delivery") {
      return [current, "shipped"];
    }
  }
  if (current === "shipped" && fulfillmentType === "pickup") {
    // Allow pickup orders that were historically marked Shipped to complete cleanly
    // as Picked Up or Delivered without getting trapped.
    return [current, "picked_up", "delivered"];
  }
  return [current, ...(allowedTransitions[current] ?? [])];
}

export function storeOrderStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
