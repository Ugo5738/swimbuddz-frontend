"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { ArrowLeft, BarChart3, DollarSign, Package, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SalesSummary {
  period_days: number;
  total_orders: number;
  paid_orders: number;
  cancelled_orders: number;
  total_revenue_ngn: number;
  average_order_value_ngn: number;
}

interface TopSellingProduct {
  product_name: string;
  variant_name: string | null;
  sku: string;
  total_quantity: number;
  total_revenue_ngn: number;
}

interface InventoryReport {
  total_variants: number;
  total_stock: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_stock_value_ngn: number;
}

interface SupplierPerformanceItem {
  supplier_id: string;
  supplier_name: string;
  total_orders: number;
  total_revenue_ngn: number;
  total_payouts_ngn: number;
  pending_payouts_ngn: number;
  commission_earned_ngn: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const PERIOD_OPTIONS = [7, 14, 30, 90] as const;

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `₦${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `₦${(value / 1_000).toFixed(0)}k`;
  }
  return `₦${value.toLocaleString()}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function StoreReportsPage() {
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierPerformanceItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesData, productsData, inventoryData, suppliersData] = await Promise.all([
        apiGet<SalesSummary>(`/api/v1/admin/store/reports/sales?days=${days}`, {
          auth: true,
        }).catch(
          () =>
            ({
              period_days: days,
              total_orders: 0,
              paid_orders: 0,
              cancelled_orders: 0,
              total_revenue_ngn: 0,
              average_order_value_ngn: 0,
            }) as SalesSummary
        ),
        apiGet<TopSellingProduct[]>(
          `/api/v1/admin/store/reports/top-products?days=${days}&limit=10`,
          { auth: true }
        ).catch(() => [] as TopSellingProduct[]),
        apiGet<InventoryReport>("/api/v1/admin/store/reports/inventory", {
          auth: true,
        }).catch(
          () =>
            ({
              total_variants: 0,
              total_stock: 0,
              low_stock_count: 0,
              out_of_stock_count: 0,
              total_stock_value_ngn: 0,
            }) as InventoryReport
        ),
        apiGet<SupplierPerformanceItem[]>(`/api/v1/admin/store/reports/suppliers?days=${days}`, {
          auth: true,
        }).catch(() => [] as SupplierPerformanceItem[]),
      ]);

      setSales(salesData);
      setTopProducts(productsData);
      setInventory(inventoryData);
      setSuppliers(suppliersData);
    } catch (e) {
      console.error("Failed to load reports:", e);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingCard text="Loading store reports..." />;
  }

  /* ---- Sales stat cards ---- */
  const salesCards = [
    {
      label: "Total Orders",
      value: sales?.total_orders ?? 0,
      subtext: `${sales?.cancelled_orders ?? 0} cancelled`,
      icon: BarChart3,
      color: "bg-purple-500",
    },
    {
      label: "Paid Orders",
      value: sales?.paid_orders ?? 0,
      subtext: `${days}-day period`,
      icon: TrendingUp,
      color: "bg-emerald-500",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(sales?.total_revenue_ngn ?? 0),
      subtext: `Last ${days} days`,
      icon: DollarSign,
      color: "bg-cyan-500",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(sales?.average_order_value_ngn ?? 0),
      subtext: "Per paid order",
      icon: DollarSign,
      color: "bg-blue-500",
    },
  ];

  /* ---- Inventory stat cards ---- */
  const inventoryCards = [
    {
      label: "Total Variants",
      value: inventory?.total_variants ?? 0,
      subtext: "Product variants",
      icon: Package,
      color: "bg-blue-500",
    },
    {
      label: "Total Stock",
      value: inventory?.total_stock ?? 0,
      subtext: "Units in stock",
      icon: Package,
      color: "bg-emerald-500",
    },
    {
      label: "Low Stock",
      value: inventory?.low_stock_count ?? 0,
      subtext: "Need restocking",
      icon: Package,
      color: "bg-amber-500",
    },
    {
      label: "Out of Stock",
      value: inventory?.out_of_stock_count ?? 0,
      subtext: "Unavailable",
      icon: Package,
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/store" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Store Reports</h1>
            <p className="text-slate-500">Sales analytics, inventory, and supplier performance</p>
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-600">Period:</span>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option}
                onClick={() => setDays(option)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  days === option
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option}d
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Sales Summary */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Sales Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesCards.map((stat) => (
            <Card key={stat.label} className="p-6">
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
          ))}
        </div>
      </div>

      {/* Top Products Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Top Selling Products</h2>
          <span className="text-sm text-slate-400">Last {days} days</span>
        </div>

        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3 text-right">Qty Sold</th>
                  <th className="pb-3 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr
                    key={`${product.sku}-${idx}`}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="py-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.product_name}</p>
                        {product.variant_name && (
                          <p className="text-xs text-slate-400">{product.variant_name}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-sm text-slate-500 font-mono">{product.sku}</td>
                    <td className="py-3 text-right text-slate-900 font-medium">
                      {product.total_quantity}
                    </td>
                    <td className="py-3 text-right text-slate-900 font-medium">
                      ₦{product.total_revenue_ngn.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">No sales data for this period</p>
        )}
      </Card>

      {/* Inventory Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Inventory Overview</h2>
          <span className="text-sm text-slate-500">
            Stock value:{" "}
            <span className="font-medium text-slate-900">
              ₦{(inventory?.total_stock_value_ngn ?? 0).toLocaleString()}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inventoryCards.map((stat) => (
            <Card key={stat.label} className="p-6">
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
          ))}
        </div>
      </div>

      {/* Supplier Performance Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Supplier Performance</h2>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>
              {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {suppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3 text-right">Orders</th>
                  <th className="pb-3 text-right">Revenue</th>
                  <th className="pb-3 text-right">Payouts</th>
                  <th className="pb-3 text-right">Pending</th>
                  <th className="pb-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.supplier_id}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="py-3 font-medium text-slate-900">{supplier.supplier_name}</td>
                    <td className="py-3 text-right text-slate-700">{supplier.total_orders}</td>
                    <td className="py-3 text-right text-slate-900 font-medium">
                      ₦{supplier.total_revenue_ngn.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-slate-700">
                      ₦{supplier.total_payouts_ngn.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={
                          supplier.pending_payouts_ngn > 0
                            ? "text-amber-600 font-medium"
                            : "text-slate-400"
                        }
                      >
                        ₦{supplier.pending_payouts_ngn.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 text-right text-emerald-600 font-medium">
                      ₦{supplier.commission_earned_ngn.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-500 py-8">No supplier data for this period</p>
        )}
      </Card>
    </div>
  );
}
