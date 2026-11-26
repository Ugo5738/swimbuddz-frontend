"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import {
  effectiveOrderTotal,
  formatNaira,
  fulfillmentStatusMeta,
  paymentStatusMeta,
  type StoreOrderDetail,
} from "@/lib/storeOrderLifecycle";
import { Package, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const { data, loading } = useApi<StoreOrderDetail[]>("/api/v1/store/orders");
  const orders = data ?? [];

  if (loading) {
    return <LoadingCard text="Loading orders..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
        <p className="text-slate-500">
          Track purchases, manage cancellations, swap sizes, or request returns and exchanges
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const payBadge = paymentStatusMeta(order.payment_status);
            const fulBadge = fulfillmentStatusMeta(order.fulfillment_status);
            const totalValue = effectiveOrderTotal(order);
            return (
              <Link key={order.id} href={`/account/orders/${order.order_number}`}>
                <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          Order #{order.order_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${payBadge.className}`}
                        >
                          {payBadge.label}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${fulBadge.className}`}
                        >
                          {fulBadge.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-slate-600">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""} •{" "}
                        {order.fulfillment_type === "pickup" ? "Pool Pickup" : "Delivery"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{formatNaira(totalValue)}</p>
                      <p className="text-xs text-cyan-600 mt-1">Manage / View →</p>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <span key={item.id}>
                          {item.variant?.product?.name || item.product_name}
                          {item.quantity > 1 && ` (×${item.quantity})`}
                          {idx < Math.min(order.items.length, 3) - 1 && ","}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="text-slate-400">+{order.items.length - 3} more</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <ShoppingBag className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">No orders yet</h2>
          <p className="text-slate-500 mb-6">Start shopping to see your orders here</p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            <Package className="w-4 h-4" />
            Browse Store
          </Link>
        </Card>
      )}
    </div>
  );
}
