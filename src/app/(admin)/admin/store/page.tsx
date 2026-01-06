"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { AlertTriangle, DollarSign, Package, ShoppingBag, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface DashboardStats {
    total_products: number;
    active_products: number;
    total_orders: number;
    pending_orders: number;
    low_stock_count: number;
    total_revenue_ngn: number;
    orders_today: number;
}

interface RecentOrder {
    id: string;
    order_number: string;
    customer_name: string;
    total_ngn: number;
    status: string;
    created_at: string;
}

export default function StoreDashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        try {
            const [statsData, ordersData] = await Promise.all([
                apiGet<DashboardStats>("/api/v1/admin/store/stats", { auth: true }).catch(
                    () =>
                    ({
                        total_products: 0,
                        active_products: 0,
                        total_orders: 0,
                        pending_orders: 0,
                        low_stock_count: 0,
                        total_revenue_ngn: 0,
                        orders_today: 0,
                    } as DashboardStats)
                ),
                apiGet<{ items: RecentOrder[] }>("/api/v1/admin/store/orders?page_size=5", {
                    auth: true,
                }).catch(() => ({ items: [] })),
            ]);

            setStats(statsData);
            setRecentOrders(ordersData.items);
        } catch (e) {
            console.error("Failed to load dashboard:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (loading) {
        return <LoadingCard text="Loading store dashboard..." />;
    }

    const statCards = [
        {
            label: "Total Products",
            value: stats?.total_products || 0,
            subtext: `${stats?.active_products || 0} active`,
            icon: Package,
            color: "bg-blue-500",
            href: "/admin/store/products",
        },
        {
            label: "Total Orders",
            value: stats?.total_orders || 0,
            subtext: `${stats?.orders_today || 0} today`,
            icon: ShoppingBag,
            color: "bg-purple-500",
            href: "/admin/store/orders",
        },
        {
            label: "Pending Orders",
            value: stats?.pending_orders || 0,
            subtext: "Need attention",
            icon: TrendingUp,
            color: "bg-amber-500",
            href: "/admin/store/orders?status=pending",
        },
        {
            label: "Total Revenue",
            value: `₦${((stats?.total_revenue_ngn || 0) / 1000).toFixed(0)}k`,
            subtext: "All time",
            icon: DollarSign,
            color: "bg-emerald-500",
            href: "/admin/store/orders",
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Store Dashboard</h1>
                    <p className="text-slate-500">Manage your products, orders, and inventory</p>
                </div>
                <Link
                    href="/admin/store/products/new"
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
                >
                    + Add Product
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <Link key={stat.label} href={stat.href}>
                        <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">{stat.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                                    <p className="text-xs text-slate-400 mt-1">{stat.subtext}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${stat.color}`}>
                                    <stat.icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Low Stock Alert */}
            {stats && stats.low_stock_count > 0 && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <div>
                            <span className="font-medium text-amber-800">
                                {stats.low_stock_count} items are low on stock
                            </span>
                            <Link
                                href="/admin/store/inventory?low_stock=true"
                                className="ml-2 text-sm text-cyan-600 hover:underline"
                            >
                                View →
                            </Link>
                        </div>
                    </div>
                </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/store/products">
                    <Card className="p-4 text-center hover:shadow-md transition-shadow">
                        <Package className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                        <span className="text-sm font-medium text-slate-700">Products</span>
                    </Card>
                </Link>
                <Link href="/admin/store/orders">
                    <Card className="p-4 text-center hover:shadow-md transition-shadow">
                        <ShoppingBag className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                        <span className="text-sm font-medium text-slate-700">Orders</span>
                    </Card>
                </Link>
                <Link href="/admin/store/inventory">
                    <Card className="p-4 text-center hover:shadow-md transition-shadow">
                        <TrendingUp className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                        <span className="text-sm font-medium text-slate-700">Inventory</span>
                    </Card>
                </Link>
                <Link href="/admin/store/categories">
                    <Card className="p-4 text-center hover:shadow-md transition-shadow">
                        <DollarSign className="w-8 h-8 mx-auto text-cyan-600 mb-2" />
                        <span className="text-sm font-medium text-slate-700">Categories</span>
                    </Card>
                </Link>
            </div>

            {/* Recent Orders */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
                    <Link
                        href="/admin/store/orders"
                        className="text-sm text-cyan-600 hover:underline"
                    >
                        View All →
                    </Link>
                </div>

                {recentOrders.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                                    <th className="pb-3">Order</th>
                                    <th className="pb-3">Customer</th>
                                    <th className="pb-3">Total</th>
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        className="border-b border-slate-50 hover:bg-slate-50"
                                    >
                                        <td className="py-3">
                                            <Link
                                                href={`/admin/store/orders/${order.id}`}
                                                className="font-medium text-cyan-600 hover:underline"
                                            >
                                                {order.order_number}
                                            </Link>
                                        </td>
                                        <td className="py-3 text-slate-700">{order.customer_name}</td>
                                        <td className="py-3 text-slate-900 font-medium">
                                            ₦{order.total_ngn.toLocaleString()}
                                        </td>
                                        <td className="py-3">
                                            <OrderStatusBadge status={order.status} />
                                        </td>
                                        <td className="py-3 text-sm text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-slate-500 py-8">No orders yet</p>
                )}
            </Card>
        </div>
    );
}

function OrderStatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { label: string; className: string }> = {
        pending_payment: { label: "Pending Payment", className: "bg-amber-100 text-amber-700" },
        paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700" },
        processing: { label: "Processing", className: "bg-blue-100 text-blue-700" },
        ready_for_pickup: { label: "Ready", className: "bg-purple-100 text-purple-700" },
        picked_up: { label: "Picked Up", className: "bg-slate-100 text-slate-700" },
        shipped: { label: "Shipped", className: "bg-cyan-100 text-cyan-700" },
        delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700" },
        cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
    };

    const config = statusConfig[status] || { label: status, className: "bg-slate-100 text-slate-700" };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
            {config.label}
        </span>
    );
}
