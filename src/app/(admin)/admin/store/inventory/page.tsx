"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { apiGet, apiPatch } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Package, AlertTriangle, Search, RefreshCw } from "lucide-react";

interface InventoryItem {
    id: string;
    variant_id: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;
    low_stock_threshold: number;
    last_restock_at: string | null;
    variant: {
        id: string;
        sku: string;
        name: string | null;
        product: {
            id: string;
            name: string;
            slug: string;
        };
    };
}

interface LowStockItem {
    variant_id: string;
    sku: string;
    product_name: string;
    variant_name: string | null;
    quantity_on_hand: number;
    quantity_available: number;
    low_stock_threshold: number;
}

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [adjusting, setAdjusting] = useState<string | null>(null);
    const [adjustAmount, setAdjustAmount] = useState<string>("");
    const [adjustNotes, setAdjustNotes] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"all" | "low">("all");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [invData, lowStockData] = await Promise.all([
                apiGet<InventoryItem[]>("/api/v1/store/admin/inventory", { auth: true }),
                apiGet<LowStockItem[]>("/api/v1/store/admin/inventory/low-stock", { auth: true }),
            ]);
            setInventory(invData);
            setLowStock(lowStockData);
        } catch (e) {
            console.error("Failed to load inventory:", e);
            toast.error("Failed to load inventory");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAdjust = async (variantId: string) => {
        const amount = parseInt(adjustAmount);
        if (isNaN(amount) || amount === 0) {
            toast.error("Enter a valid quantity adjustment");
            return;
        }

        try {
            await apiPatch(`/api/v1/store/admin/inventory/${variantId}`, {
                quantity: amount,
                notes: adjustNotes || undefined,
            }, { auth: true });
            toast.success("Inventory adjusted");
            setAdjusting(null);
            setAdjustAmount("");
            setAdjustNotes("");
            loadData();
        } catch {
            toast.error("Failed to adjust inventory");
        }
    };

    const filteredInventory = inventory.filter((item) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            item.variant.sku.toLowerCase().includes(searchLower) ||
            item.variant.product.name.toLowerCase().includes(searchLower) ||
            (item.variant.name?.toLowerCase().includes(searchLower))
        );
    });

    if (loading) {
        return <LoadingCard text="Loading inventory..." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
                    <p className="text-slate-500">{inventory.length} variants tracked</p>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-amber-900">Low Stock Alert</h3>
                            <p className="text-sm text-amber-700">
                                {lowStock.length} item(s) are below threshold
                            </p>
                            <div className="mt-2 space-y-1">
                                {lowStock.slice(0, 5).map((item) => (
                                    <p key={item.variant_id} className="text-sm text-amber-800">
                                        • {item.product_name} {item.variant_name ? `(${item.variant_name})` : ""} - {item.quantity_available} left
                                    </p>
                                ))}
                                {lowStock.length > 5 && (
                                    <p className="text-sm text-amber-600">
                                        ... and {lowStock.length - 5} more
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab("all")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "all"
                        ? "border-cyan-500 text-cyan-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <Package className="w-4 h-4 inline mr-2" />
                    All Inventory ({inventory.length})
                </button>
                <button
                    onClick={() => setActiveTab("low")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === "low"
                        ? "border-amber-500 text-amber-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                >
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Low Stock ({lowStock.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by SKU or product name..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
            </div>

            {/* Inventory Table */}
            <Card className="overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Product / Variant
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                SKU
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                On Hand
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Reserved
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Available
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {(activeTab === "all" ? filteredInventory : lowStock.map(l => ({
                            id: l.variant_id,
                            variant_id: l.variant_id,
                            quantity_on_hand: l.quantity_on_hand,
                            quantity_reserved: 0,
                            quantity_available: l.quantity_available,
                            low_stock_threshold: l.low_stock_threshold,
                            last_restock_at: null,
                            variant: {
                                id: l.variant_id,
                                sku: l.sku,
                                name: l.variant_name,
                                product: { id: "", name: l.product_name, slug: "" }
                            }
                        }))).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">
                                        {item.variant.product.name}
                                    </div>
                                    {item.variant.name && (
                                        <div className="text-sm text-slate-500">
                                            {item.variant.name}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                                    {item.variant.sku}
                                </td>
                                <td className="px-4 py-3 text-center font-medium">
                                    {item.quantity_on_hand}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-500">
                                    {item.quantity_reserved}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity_available <= 0
                                        ? "bg-red-100 text-red-800"
                                        : item.quantity_available <= item.low_stock_threshold
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-emerald-100 text-emerald-800"
                                        }`}>
                                        {item.quantity_available}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {adjusting === item.variant_id ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <input
                                                type="number"
                                                value={adjustAmount}
                                                onChange={(e) => setAdjustAmount(e.target.value)}
                                                placeholder="+/-"
                                                className="w-20 px-2 py-1 text-sm border rounded"
                                            />
                                            <button
                                                onClick={() => handleAdjust(item.variant_id)}
                                                className="px-3 py-1 text-sm bg-cyan-600 text-white rounded hover:bg-cyan-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAdjusting(null);
                                                    setAdjustAmount("");
                                                }}
                                                className="px-2 py-1 text-sm text-slate-500 hover:text-slate-700"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAdjusting(item.variant_id)}
                                            className="px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                                        >
                                            Adjust
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredInventory.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                    No inventory items found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>
        </div>
    );
}
