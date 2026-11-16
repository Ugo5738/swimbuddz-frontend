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
  paid: ["processing", "cancelled"],
  processing: ["ready_for_pickup", "shipped", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  shipped: ["delivered", "cancelled"],
  picked_up: [],
  delivered: [],
  cancelled: [],
  refunded: [],
};

export function allowedStoreOrderStatuses(current: string): string[] {
  return [current, ...(allowedTransitions[current] ?? [])];
}

export function storeOrderStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
