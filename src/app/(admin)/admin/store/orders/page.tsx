"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { Eye, Package, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Order {
    id: string;
    order_number: string;
    status: string;
    fulfillment_type: string;
    total_ngn: number;
    created_at: string;
    member?: {
        id: string;
        auth_id: string;
        email?: string;
    };
    items_count?: number;
}

interface OrdersResponse {
    items: Order[];
    total: number;
    page: number;
    page_size: number;
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

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");

    const loadOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set("page", String(page));
            params.set("page_size", "20");
            if (search) params.set("search", search);
            if (statusFilter) params.set("status", statusFilter);

            const data = await apiGet<OrdersResponse>(`/api/v1/admin/store/orders?${params.toString()}`, {
                auth: true,
            });
            setOrders(data.items);
            setTotal(data.total);
        } catch (e) {
            console.error("Failed to load orders:", e);
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            await apiPatch(`/api/v1/admin/store/orders/${orderId}`, { status: newStatus }, { auth: true });
            toast.success("Order status updated");
            loadOrders();
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    const totalPages = Math.ceil(total / 20);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
                    <p className="text-slate-500">{total} orders total</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by order # or email..."
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    >
                        <option value="">All Statuses</option>
                        {STATUSES.map((s) => (
                            <option key={s} value={s}>
                                {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            </option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Orders Table */}
            {loading ? (
                <LoadingCard text="Loading orders..." />
            ) : orders.length > 0 ? (
                <Card className="overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr className="text-left text-sm text-slate-600">
                                <th className="px-6 py-3">Order</th>
                                <th className="px-6 py-3">Customer</th>
                                <th className="px-6 py-3">Total</th>
                                <th className="px-6 py-3">Fulfillment</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-slate-900">
                                                #{order.order_number}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {order.member?.email || "—"}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        ₦{order.total_ngn.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                                            {order.fulfillment_type === "pickup" ? (
                                                <>
                                                    <Package className="w-4 h-4" />
                                                    Pickup
                                                </>
                                            ) : (
                                                "Delivery"
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateStatus(order.id, e.target.value)}
                                            className="text-sm px-2 py-1 border border-slate-200 rounded focus:ring-2 focus:ring-cyan-400"
                                        >
                                            {STATUSES.map((s) => (
                                                <option key={s} value={s}>
                                                    {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/admin/store/orders/${order.id}`}
                                                className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
                            <span className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            ) : (
                <Card className="p-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-medium text-slate-900 mb-2">No orders found</h3>
                    <p className="text-slate-500">
                        {search || statusFilter
                            ? "Try adjusting your filters"
                            : "Orders will appear here when customers place them"}
                    </p>
                </Card>
            )}
        </div>
    );
}
