"use client";

import { AdminOrderCancelRefundModal } from "@/components/admin/store/AdminOrderCancelRefundModal";
import { AdminOrderCasesSection } from "@/components/admin/store/AdminOrderCasesSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import {
  effectiveOrderTotal,
  formatNaira,
  fulfillmentStatusMeta,
  paymentStatusMeta,
  type OrderCase,
  type OrderRefundSummary,
  type StoreOrderDetail,
} from "@/lib/storeOrderLifecycle";
import {
  allowedStoreOrderStatuses,
  storeOrderStatusLabel,
} from "@/lib/storeOrderStatuses";
import { ArrowLeft, MapPin, Package, Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<StoreOrderDetail | null>(null);
  const [cases, setCases] = useState<OrderCase[]>([]);
  const [refunds, setRefunds] = useState<OrderRefundSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);

  // Audited Cancel & Issue Refund modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const [data, caseBundle] = await Promise.all([
        apiGet<StoreOrderDetail>(`/api/v1/admin/store/orders/${orderId}`, { auth: true }),
        apiGet<{ cases: OrderCase[]; refunds: OrderRefundSummary[] }>(
          `/api/v1/admin/store/orders/${orderId}/cases`,
          { auth: true }
        ).catch(() => ({ cases: [], refunds: [] })),
      ]);
      setOrder(data);
      setCases(caseBundle.cases);
      setRefunds(caseBundle.refunds);
      setAdminNotes(data.admin_notes || "");
      setTrackingNumber(data.tracking_number || data.delivery_notes || "");
    } catch (e) {
      console.error("Failed to load order:", e);
      toast.error("Order not found");
      router.push("/admin/store/orders");
    } finally {
      setLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const updateOrder = async (updates: {
    status?: string;
    admin_notes?: string;
    tracking_number?: string;
  }) => {
    setSaving(true);
    try {
      await apiPatch(`/api/v1/admin/store/orders/${orderId}`, updates, {
        auth: true,
      });
      toast.success("Order updated");
      loadOrder();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "Order update rejected. Check payment verification and allowed status changes."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading order..." />;
  }

  if (!order) {
    return null;
  }

  const customerName = order.customer_name || order.customer_email || "Guest";
  const payBadge = paymentStatusMeta(order.payment_status);
  const fulBadge = fulfillmentStatusMeta(order.fulfillment_status);
  const orderTotal = effectiveOrderTotal(order);
  const storeCredit = Number(order.store_credit_applied_ngn || 0);
  const bubblesNgn = (order.bubbles_applied || 0) * 100;
  const cashPayable = Number(order.cash_payable_ngn ?? order.total_ngn ?? 0);
  const isPaidOrder =
    order.payment_status === "paid" ||
    order.payment_status === "partially_refunded" ||
    ["paid", "processing", "ready_for_pickup", "picked_up", "shipped", "delivered"].includes(
      order.status
    );

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/store/orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.order_number}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${payBadge.className}`}>
              Payment: {payBadge.label}
            </span>
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${fulBadge.className}`}>
              Fulfillment: {fulBadge.label}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(order.created_at).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <select
          value={order.status}
          onChange={(e) => updateOrder({ status: e.target.value })}
          className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400"
        >
          {allowedStoreOrderStatuses(order.status).map((s) => (
            <option key={s} value={s}>
              {storeOrderStatusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post-Purchase Cases & Refunds */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Cancellations, Returns &amp; Refunds
              </h2>
              <Link href="/admin/store/cases" className="text-xs text-cyan-600 hover:underline">
                All Store Cases →
              </Link>
            </div>
            <AdminOrderCasesSection cases={cases} refunds={refunds} onUpdated={loadOrder} />
          </Card>

          {/* Order Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
            <div className="divide-y divide-slate-100">
              {order.items.map((item) => {
                const primaryImage =
                  item.variant?.product?.images?.find((img) => img.is_primary) ||
                  item.variant?.product?.images?.[0];

                return (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={item.variant?.product?.name || item.product_name || "Product"}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">
                        {item.variant?.product?.name || item.product_name}
                      </p>
                      <p className="text-sm text-slate-500">
                        SKU: {item.variant?.sku || item.sku}
                        {item.sourcing_type && ` • ${item.sourcing_type}`}
                      </p>
                      {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                        <p className="text-sm text-slate-500">
                          {Object.entries(item.variant.options)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" • ")}
                        </p>
                      )}
                      <p className="text-sm text-slate-600 mt-1">
                        Qty: {item.quantity} × {formatNaira(item.unit_price_ngn)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatNaira(item.line_total_ngn)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-600" />
              Customer
            </h2>
            <p className="font-medium text-slate-900">{customerName}</p>
            {order.customer_email && order.customer_name && (
              <p className="text-sm text-slate-500">{order.customer_email}</p>
            )}
            {order.customer_phone && (
              <p className="text-sm text-slate-500">{order.customer_phone}</p>
            )}
            {order.member_id && (
              <Link
                href={`/admin/members/${order.member_id}`}
                className="text-sm text-cyan-600 hover:underline"
              >
                View Member Profile →
              </Link>
            )}
          </Card>

          {/* Fulfillment Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              {order.fulfillment_type === "pickup" ? (
                <>
                  <MapPin className="w-5 h-5 text-cyan-600" />
                  Pickup Details
                </>
              ) : (
                <>
                  <Truck className="w-5 h-5 text-cyan-600" />
                  Delivery Details
                </>
              )}
            </h2>

            {order.fulfillment_type === "pickup" && order.pickup_location && (
              <div>
                <p className="font-medium text-slate-900">{order.pickup_location.name}</p>
                {order.pickup_location.address && (
                  <p className="text-slate-500">{order.pickup_location.address}</p>
                )}
              </div>
            )}

            {order.fulfillment_type === "delivery" && order.delivery_address && (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-900">{order.delivery_address.street}</p>
                  <p className="text-slate-500">
                    {order.delivery_address.city}, {order.delivery_address.state}
                  </p>
                  <p className="text-slate-500">{order.delivery_address.phone}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tracking Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => updateOrder({ tracking_number: trackingNumber })}
                      disabled={saving}
                    >
                      {saving ? "..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Notes</h2>

            {order.customer_notes && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700">Customer Notes</p>
                <p className="text-sm text-slate-600">{order.customer_notes}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Admin Notes (internal)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                placeholder="Add internal notes..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 resize-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => updateOrder({ admin_notes: adminNotes })}
                disabled={saving}
                className="mt-2"
              >
                {saving ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">{formatNaira(order.subtotal_ngn)}</span>
              </div>

              {Number(order.discount_amount_ngn) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>
                    Discount
                    {order.discount_code && ` (${order.discount_code})`}
                  </span>
                  <span>-{formatNaira(order.discount_amount_ngn)}</span>
                </div>
              )}

              {Number(order.delivery_fee_ngn) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Delivery</span>
                  <span className="text-slate-900">{formatNaira(order.delivery_fee_ngn)}</span>
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200 flex justify-between font-semibold">
                <span className="text-slate-900">Order Total</span>
                <span className="text-slate-900">{formatNaira(orderTotal)}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                {storeCredit > 0 && (
                  <div className="flex justify-between">
                    <span>Store Credit</span>
                    <span>{formatNaira(storeCredit)}</span>
                  </div>
                )}
                {bubblesNgn > 0 && (
                  <div className="flex justify-between">
                    <span>Bubbles ({order.bubbles_applied} 🫧)</span>
                    <span>{formatNaira(bubblesNgn)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-sm text-cyan-700 pt-1">
                  <span>Cash Paid / Due</span>
                  <span>{formatNaira(cashPayable)}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-2">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Quick Actions</h3>

              {order.status === "paid" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateOrder({ status: "processing" })}
                  disabled={saving}
                >
                  Mark as Processing
                </Button>
              )}

              {order.status === "processing" && order.fulfillment_type === "pickup" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateOrder({ status: "ready_for_pickup" })}
                  disabled={saving}
                >
                  Mark Ready for Pickup
                </Button>
              )}

              {order.status === "processing" && order.fulfillment_type === "delivery" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateOrder({ status: "shipped" })}
                  disabled={saving}
                >
                  Mark as Shipped
                </Button>
              )}

              {order.status === "ready_for_pickup" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateOrder({ status: "picked_up" })}
                  disabled={saving}
                >
                  Mark as Picked Up
                </Button>
              )}

              {order.status === "shipped" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => updateOrder({ status: "delivered" })}
                  disabled={saving}
                >
                  Mark as Delivered
                </Button>
              )}

              {!["cancelled", "refunded"].includes(order.status) && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-rose-600 hover:bg-rose-50"
                  onClick={() => {
                    if (isPaidOrder) {
                      setCancelModalOpen(true);
                    } else {
                      updateOrder({ status: "cancelled" });
                    }
                  }}
                  disabled={saving}
                >
                  {isPaidOrder ? "Cancel & Issue Refund" : "Cancel Unpaid Order"}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AdminOrderCancelRefundModal
        order={order}
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={loadOrder}
      />
    </div>
  );
}
