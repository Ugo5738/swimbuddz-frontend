"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Order {
    id: string;
    order_number: string;
    status: string;
    fulfillment_type: string;
    subtotal_ngn: number;
    discount_amount_ngn: number;
    delivery_fee_ngn: number;
    total_ngn: number;
    created_at: string;
    items: {
        id: string;
        quantity: number;
        unit_price_ngn: number;
        variant?: {
            name: string | null;
            product?: {
                name: string;
            };
        };
    }[];
}

interface OrdersResponse {
    items: Order[];
    total: number;
    page: number;
    page_size: number;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGet<OrdersResponse>("/api/v1/store/orders/me", {
                auth: true,
            });
            setOrders(data.items);
        } catch (e) {
            console.error("Failed to load orders:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    if (loading) {
        return <LoadingCard text="Loading orders..." />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
                <p className="text-slate-500">Track your store purchases</p>
            </div>

            {orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Link key={order.id} href={`/dashboard/orders/${order.order_number}`}>
                            <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-900">
                                                Order #{order.order_number}
                                            </span>
                                            <OrderStatusBadge status={order.status} />
                                        </div>
                                        <p className="text-sm text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString("en-NG", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                        <p className="text-sm text-slate-600">
                                            {order.items.length} item{order.items.length !== 1 ? "s" : ""} •{" "}
                                            {order.fulfillment_type === "pickup" ? "Pool Pickup" : "Delivery"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-slate-900">
                                            ₦{order.total_ngn.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Order Items Preview */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                                        {order.items.slice(0, 3).map((item, idx) => (
                                            <span key={item.id}>
                                                {item.variant?.product?.name}
                                                {item.quantity > 1 && ` (×${item.quantity})`}
                                                {idx < Math.min(order.items.length, 3) - 1 && ","}
                                            </span>
                                        ))}
                                        {order.items.length > 3 && (
                                            <span className="text-slate-400">
                                                +{order.items.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
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

function OrderStatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        pending_payment: { label: "Pending Payment", className: "bg-amber-100 text-amber-700" },
        paid: { label: "Paid", className: "bg-blue-100 text-blue-700" },
        processing: { label: "Processing", className: "bg-blue-100 text-blue-700" },
        ready_for_pickup: { label: "Ready for Pickup", className: "bg-emerald-100 text-emerald-700" },
        picked_up: { label: "Picked Up", className: "bg-slate-100 text-slate-700" },
        shipped: { label: "Shipped", className: "bg-cyan-100 text-cyan-700" },
        delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700" },
        cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
        refunded: { label: "Refunded", className: "bg-slate-100 text-slate-700" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-slate-100 text-slate-700" };

    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}
