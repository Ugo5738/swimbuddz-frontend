"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { Eye, Package, Pencil, Plus, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  slug: string;
  base_price_ngn: number;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  category?: { name: string };
  images: { url: string; is_primary: boolean }[];
  _variant_count?: number;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", "20");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiGet<ProductsResponse>(
        `/api/v1/admin/store/products?${params.toString()}`,
        {
          auth: true,
        },
      );
      setProducts(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Failed to load products:", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500">{total} products total</p>
        </div>
        <Link href="/admin/store/products/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
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
                placeholder="Search products..."
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
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </Card>

      {/* Products Table */}
      {loading ? (
        <LoadingCard text="Loading products..." />
      ) : products.length > 0 ? (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm text-slate-600">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const primaryImage =
                  product.images.find((img) => img.is_primary) ||
                  product.images[0];

                return (
                  <tr
                    key={product.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          {primaryImage ? (
                            <Image
                              src={primaryImage.url}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {product.sourcing_type === "preorder"
                              ? "Pre-order"
                              : "In Stock"}
                            {product.is_featured && " • Featured"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.category?.name || "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      ₦{product.base_price_ngn.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/store/product/${product.slug}`}
                          target="_blank"
                          className="p-2 text-slate-400 hover:text-cyan-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/admin/store/products/${product.id}`}
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
          <h3 className="font-medium text-slate-900 mb-2">No products found</h3>
          <p className="text-slate-500 mb-6">
            {search || statusFilter
              ? "Try adjusting your filters"
              : "Start by adding your first product"}
          </p>
          <Link href="/admin/store/products/new">
            <Button>Add Product</Button>
          </Link>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
    draft: { label: "Draft", className: "bg-amber-100 text-amber-700" },
    archived: { label: "Archived", className: "bg-slate-100 text-slate-600" },
  };

  const c = config[status] || {
    label: status,
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${c.className}`}
    >
      {c.label}
    </span>
  );
}
