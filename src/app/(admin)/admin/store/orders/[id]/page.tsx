"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft, MapPin, Package, Truck, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
    member?: {
        id: string;
        auth_id: string;
        profile?: {
            first_name: string;
            last_name: string;
        };
    };
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

const STATUSES = [
    "pending_payment",
    "paid",
    "processing",
    "ready_for_pickup",
    "picked_up",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
];

export default function AdminOrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [adminNotes, setAdminNotes] = useState("");
    const [trackingNumber, setTrackingNumber] = useState("");
    const [saving, setSaving] = useState(false);

    const loadOrder = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGet<OrderDetail>(`/api/v1/admin/store/orders/${orderId}`, {
                auth: true,
            });
            setOrder(data);
            setAdminNotes(data.admin_notes || "");
            setTrackingNumber(data.tracking_number || "");
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

    const updateOrder = async (updates: Partial<OrderDetail>) => {
        setSaving(true);
        try {
            await apiPatch(`/api/v1/admin/store/orders/${orderId}`, updates, { auth: true });
            toast.success("Order updated");
            loadOrder();
        } catch (e) {
            toast.error("Failed to update order");
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

    const customerName = order.member?.profile
        ? `${order.member.profile.first_name} ${order.member.profile.last_name}`
        : "Guest";

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
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Order #{order.order_number}
                    </h1>
                    <p className="text-slate-500">
                        {new Date(order.created_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                </div>
                <select
                    value={order.status}
                    onChange={(e) => updateOrder({ status: e.target.value })}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400"
                >
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Order Items */}
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
                                            <p className="text-sm text-slate-500">
                                                SKU: {item.variant?.sku}
                                            </p>
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

                    {/* Customer Info */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-cyan-600" />
                            Customer
                        </h2>
                        <p className="font-medium text-slate-900">{customerName}</p>
                        {order.member?.id && (
                            <Link
                                href={`/admin/members/${order.member.id}`}
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

                            {!["cancelled", "refunded", "picked_up", "delivered"].includes(order.status) && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full text-rose-600 hover:bg-rose-50"
                                    onClick={() => updateOrder({ status: "cancelled" })}
                                    disabled={saving}
                                >
                                    Cancel Order
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
