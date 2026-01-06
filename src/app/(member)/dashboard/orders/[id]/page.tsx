"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { ArrowLeft, MapPin, Package, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface OrderItem {
    id: string;
    quantity: number;
    unit_price_ngn: number;
    line_total_ngn: number;
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

interface OrderDetail {
    id: string;
    order_number: string;
    status: string;
    fulfillment_type: string;
    subtotal_ngn: number;
    discount_amount_ngn: number;
    delivery_fee_ngn: number;
    total_ngn: number;
    discount_code: string | null;
    customer_notes: string | null;
    admin_notes: string | null;
    created_at: string;
    updated_at: string;
    paid_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    items: OrderItem[];
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
    tracking_number?: string;
    tracking_url?: string;
}

export default function OrderDetailPage() {
    const params = useParams();
    const orderNumber = params.id as string;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadOrder = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGet<OrderDetail>(`/api/v1/store/orders/me/${orderNumber}`, {
                auth: true,
            });
            setOrder(data);
        } catch (e) {
            console.error("Failed to load order:", e);
            setError(e instanceof Error ? e.message : "Order not found");
        } finally {
            setLoading(false);
        }
    }, [orderNumber]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    if (loading) {
        return <LoadingCard text="Loading order..." />;
    }

    if (error || !order) {
        return (
            <div className="text-center py-12">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">Order not found</h2>
                <p className="text-slate-500 mb-4">{error}</p>
                <Link href="/dashboard/orders">
                    <Button variant="secondary">Back to Orders</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Back Link */}
            <Link
                href="/dashboard/orders"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Orders
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Order #{order.order_number}
                    </h1>
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
                <OrderStatusBadge status={order.status} />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Order Items */}
                <div className="lg:col-span-2 space-y-4">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Items</h2>
                        <div className="divide-y divide-slate-100">
                            {order.items.map((item) => {
                                const primaryImage = item.variant?.product?.images?.find(
                                    (img) => img.is_primary
                                ) || item.variant?.product?.images?.[0];

                                return (
                                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                        <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {primaryImage ? (
                                                <Image
                                                    src={primaryImage.url}
                                                    alt={item.variant?.product?.name || "Product"}
                                                    fill
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
                                                {item.variant?.product?.name}
                                            </p>
                                            {item.variant?.name && (
                                                <p className="text-sm text-slate-500">{item.variant.name}</p>
                                            )}
                                            {item.variant?.options && Object.keys(item.variant.options).length > 0 && (
                                                <p className="text-sm text-slate-500">
                                                    {Object.entries(item.variant.options)
                                                        .map(([k, v]) => `${k}: ${v}`)
                                                        .join(" • ")}
                                                </p>
                                            )}
                                            <p className="text-sm text-slate-600 mt-1">
                                                Qty: {item.quantity} × ₦{item.unit_price_ngn.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-900">
                                                ₦{item.line_total_ngn.toLocaleString()}
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

                                {order.tracking_number && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-600">
                                            Tracking: {order.tracking_number}
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

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <Card className="p-6 sticky top-24">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Order Summary</h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="text-slate-900">₦{order.subtotal_ngn.toLocaleString()}</span>
                            </div>

                            {order.discount_amount_ngn > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>
                                        Discount
                                        {order.discount_code && ` (${order.discount_code})`}
                                    </span>
                                    <span>-₦{order.discount_amount_ngn.toLocaleString()}</span>
                                </div>
                            )}

                            {order.delivery_fee_ngn > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Delivery</span>
                                    <span className="text-slate-900">₦{order.delivery_fee_ngn.toLocaleString()}</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-200 flex justify-between font-semibold">
                                <span className="text-slate-900">Total</span>
                                <span className="text-cyan-600">₦{order.total_ngn.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Order Timeline */}
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Timeline</h3>
                            <div className="space-y-2 text-sm">
                                <TimelineItem
                                    label="Order placed"
                                    date={order.created_at}
                                    done={true}
                                />
                                <TimelineItem
                                    label="Payment received"
                                    date={order.paid_at}
                                    done={!!order.paid_at}
                                />
                                {order.fulfillment_type === "delivery" ? (
                                    <>
                                        <TimelineItem
                                            label="Shipped"
                                            date={order.shipped_at}
                                            done={!!order.shipped_at}
                                        />
                                        <TimelineItem
                                            label="Delivered"
                                            date={order.delivered_at}
                                            done={!!order.delivered_at}
                                        />
                                    </>
                                ) : (
                                    <TimelineItem
                                        label="Ready for pickup"
                                        date={order.status === "ready_for_pickup" ? new Date().toISOString() : null}
                                        done={["ready_for_pickup", "picked_up"].includes(order.status)}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Need Help */}
                        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                            <p className="text-sm text-slate-500">
                                Need help with your order?
                            </p>
                            <a
                                href="mailto:hello@swimbuddz.com"
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
        <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}

function TimelineItem({ label, date, done }: { label: string; date: string | null; done: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div
                className={`w-2 h-2 rounded-full ${done ? "bg-emerald-500" : "bg-slate-200"
                    }`}
            />
            <span className={done ? "text-slate-900" : "text-slate-400"}>
                {label}
            </span>
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
