"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { ArrowLeft, Pencil, Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Supplier {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  commission_percent: number | null;
  is_verified: boolean;
  status: string;
  is_active: boolean;
  total_products: number;
  total_orders: number;
  created_at: string;
}

interface SuppliersResponse {
  items: Supplier[];
  total: number;
  page: number;
  page_size: number;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  probation: { label: "Probation", className: "bg-amber-100 text-amber-700" },
  suspended: { label: "Suspended", className: "bg-rose-100 text-rose-700" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-600" },
};

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("page_size", "50");
      if (search) params.set("search", search);

      const data = await apiGet<SuppliersResponse>(
        `/api/v1/admin/store/suppliers?${params.toString()}`,
        { auth: true }
      );
      setSuppliers(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load suppliers:", e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/store"
            className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Store
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-slate-500">{total} suppliers total</p>
        </div>
        <Link
          href="/admin/store/suppliers/new"
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </Link>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Suppliers Table */}
      {loading ? (
        <LoadingCard text="Loading suppliers..." />
      ) : suppliers.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-6 py-3">Business Name</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Commission</th>
                <th className="px-6 py-3 text-center">Products</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => {
                const badge = STATUS_BADGES[supplier.status] || STATUS_BADGES.inactive;
                return (
                  <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{supplier.name}</p>
                        {supplier.contact_email && (
                          <p className="text-xs text-slate-500">{supplier.contact_email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm">
                      {supplier.contact_name || "—"}
                      {supplier.contact_phone && (
                        <p className="text-xs text-slate-400">{supplier.contact_phone}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {supplier.commission_percent != null
                        ? `${supplier.commission_percent}%`
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {supplier.total_products}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link
                          href={`/admin/store/suppliers/${supplier.id}/edit`}
                          className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h3 className="font-medium text-slate-900 mb-2">No suppliers found</h3>
          <p className="text-slate-500 mb-4">
            {search
              ? "Try adjusting your search"
              : "Add your first supplier to start selling products"}
          </p>
          {!search && (
            <Link
              href="/admin/store/suppliers/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add First Supplier
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
