"use client";

import { OrderCasesAndRefundsCard } from "@/components/store/orders/OrderCasesAndRefundsCard";
import { OrderManagePanel } from "@/components/store/orders/OrderManagePanel";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  effectiveOrderTotal,
  formatNaira,
  fulfillmentStatusMeta,
  paymentStatusMeta,
  type OrderActionEligibility,
  type StoreOrderDetail,
} from "@/lib/storeOrderLifecycle";
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function OrderDetailPage() {
  const params = useParams();
  const orderNumber = params.id as string;

  const {
    data: order,
    loading,
    error,
    refetch: refetchOrder,
  } = useApi<StoreOrderDetail>(`/api/v1/store/orders/${orderNumber}`);

  const {
    data: eligibility,
    refetch: refetchEligibility,
  } = useApi<OrderActionEligibility>(
    order ? `/api/v1/store/orders/${orderNumber}/actions` : null
  );

  const handleRefresh = () => {
    refetchOrder();
    refetchEligibility();
  };

  if (loading) {
    return <LoadingCard text="Loading order..." />;
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Order not found</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <Link href="/account/orders">
          <Button variant="secondary">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const paymentBadge = paymentStatusMeta(eligibility?.payment_status ?? order.payment_status);
  const fulfillmentBadge = fulfillmentStatusMeta(
    eligibility?.fulfillment_status ?? order.fulfillment_status
  );
  const orderTotal = effectiveOrderTotal(order);
  const bubblesNgn = (order.bubbles_applied || 0) * 100;
  const storeCredit = Number(order.store_credit_applied_ngn || 0);
  const cashPayable = Number(order.cash_payable_ngn ?? order.total_ngn ?? 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </Link>

      {/* Header with Separated Payment & Fulfillment Statuses (ADR-024) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order #{order.order_number}</h1>
          <p className="text-slate-500">
            Placed on{" "}
            {new Date(order.created_at).toLocaleDateString("en-NG", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${paymentBadge.className}`}>
            Payment: {paymentBadge.label}
          </span>
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${fulfillmentBadge.className}`}
          >
            Fulfillment: {fulfillmentBadge.label}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Post-Purchase Actions */}
          {eligibility && (
            <OrderManagePanel
              order={order}
              eligibility={eligibility}
              onUpdated={handleRefresh}
            />
          )}

          {/* Active Requests & Refunds Tracker */}
          {eligibility && (
            <OrderCasesAndRefundsCard
              orderNumber={order.order_number}
              cases={eligibility.cases}
              refunds={eligibility.refunds}
              onUpdated={handleRefresh}
            />
          )}

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
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {item.variant?.product?.name || item.product_name}
                        </p>
                        {(item.is_preorder || item.sourcing_type === "preorder") && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Preorder
                          </span>
                        )}
                      </div>
                      {(item.variant?.name || item.variant_name) && (
                        <p className="text-sm text-slate-500">
                          {item.variant?.name || item.variant_name}
                        </p>
                      )}
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
                {order.status === "ready_for_pickup" && (
                  <p className="mt-3 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                    ✨ Your order is ready! Pick it up at your next session.
                  </p>
                )}
              </div>
            )}

            {order.fulfillment_type === "delivery" && order.delivery_address && (
              <div>
                <p className="text-slate-900">{order.delivery_address.street}</p>
                <p className="text-slate-500">
                  {order.delivery_address.city}, {order.delivery_address.state}
                </p>
                <p className="text-slate-500">{order.delivery_address.phone}</p>

                {(order.tracking_number || order.delivery_notes) && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-600">
                      Tracking: {order.tracking_number || order.delivery_notes}
                    </p>
                    {order.tracking_url && (
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-cyan-600 hover:underline"
                      >
                        Track Package →
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {order.customer_notes && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700">Your notes:</p>
                <p className="text-sm text-slate-500">{order.customer_notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Order Summary & Tender Breakdown */}
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

              {(storeCredit > 0 || bubblesNgn > 0) && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {storeCredit > 0 && (
                    <div className="flex justify-between">
                      <span>Store Credit Applied</span>
                      <span className="text-emerald-700">-{formatNaira(storeCredit)}</span>
                    </div>
                  )}
                  {bubblesNgn > 0 && (
                    <div className="flex justify-between">
                      <span>Bubbles Applied ({order.bubbles_applied} 🫧)</span>
                      <span className="text-cyan-700">-{formatNaira(bubblesNgn)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-sm pt-1">
                    <span className="text-slate-800">Card / Bank Paid</span>
                    <span className="text-cyan-600">{formatNaira(cashPayable)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Timeline */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Timeline</h3>
              <div className="space-y-2 text-sm">
                <TimelineItem label="Order placed" date={order.created_at} done={true} />
                <TimelineItem label="Payment received" date={order.paid_at} done={!!order.paid_at} />
                {order.fulfillment_type === "delivery" ? (
                  <>
                    <TimelineItem
                      label="Shipped"
                      date={order.shipped_at ?? null}
                      done={!!order.shipped_at || ["shipped", "delivered"].includes(order.status)}
                    />
                    <TimelineItem
                      label="Delivered"
                      date={order.delivered_at ?? order.fulfilled_at ?? null}
                      done={!!order.delivered_at || order.status === "delivered"}
                    />
                  </>
                ) : (
                  <TimelineItem
                    label="Ready for pickup"
                    date={order.fulfilled_at ?? null}
                    done={["ready_for_pickup", "picked_up"].includes(order.status)}
                  />
                )}
                {order.cancelled_at && (
                  <TimelineItem label="Cancelled" date={order.cancelled_at} done={true} />
                )}
                {order.refunded_at && (
                  <TimelineItem label="Refunded" date={order.refunded_at} done={true} />
                )}
              </div>
            </div>

            {/* Need Help */}
            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">Need extra help with your order?</p>
              <a
                href="mailto:swimbuddz@gmail.com"
                className="text-sm text-cyan-600 hover:underline"
              >
                Contact Support
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  done,
}: {
  label: string;
  date: string | null;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${done ? "bg-emerald-500" : "bg-slate-200"}`} />
      <span className={done ? "text-slate-900" : "text-slate-400"}>{label}</span>
      {date && done && (
        <span className="text-slate-400 ml-auto text-xs">
          {new Date(date).toLocaleDateString("en-NG", {
            month: "short",
            day: "numeric",
          })}
        </span>
      )}
    </div>
  );
}
