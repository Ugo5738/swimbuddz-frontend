"use client";

import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { ArrowLeft, Package, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  base_price_ngn: number;
  status: string;
}

interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  products: ProductSummary[];
}

interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  base_price_ngn: number;
  status: string;
}

interface ProductListResponse {
  items: ProductListItem[];
  total: number;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const collectionId = params.id as string;

  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // Add product state
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductListItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCollection = useCallback(async () => {
    try {
      const data = await apiGet<CollectionDetail>(
        `/api/v1/admin/store/collections/${collectionId}`,
        { auth: true }
      );
      setCollection(data);
    } catch {
      toast.error("Failed to load collection");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const searchProducts = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const data = await apiGet<ProductListResponse>(
          `/api/v1/admin/store/products?search=${encodeURIComponent(query)}&page_size=20`,
          { auth: true }
        );
        // Filter out products already in the collection
        const existingIds = new Set(collection?.products.map((p) => p.id) || []);
        setSearchResults(data.items.filter((p) => !existingIds.has(p.id)));
      } catch {
        toast.error("Failed to search products");
      } finally {
        setSearching(false);
      }
    },
    [collection?.products]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      searchProducts(value);
    }, 300);
  };

  const handleAddProduct = async (productId: string) => {
    setAdding(productId);
    try {
      await apiPost(
        `/api/v1/admin/store/collections/${collectionId}/products/${productId}`,
        {},
        { auth: true }
      );
      toast.success("Product added to collection");
      setSearchResults((prev) => prev.filter((p) => p.id !== productId));
      loadCollection();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setAdding(null);
    }
  };

  const handleRemoveProduct = async (productId: string, productName: string) => {
    if (!confirm(`Remove "${productName}" from this collection?`)) return;

    setRemoving(productId);
    try {
      await apiDelete(`/api/v1/admin/store/collections/${collectionId}/products/${productId}`, {
        auth: true,
      });
      toast.success("Product removed from collection");
      loadCollection();
    } catch {
      toast.error("Failed to remove product");
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return <LoadingCard text="Loading collection..." />;
  }

  if (!collection) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-500">Collection not found</p>
        <Link
          href="/admin/store/collections"
          className="text-cyan-600 hover:underline mt-2 inline-block"
        >
          Back to Collections
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/store/collections"
          className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Collections
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{collection.name}</h1>
            {collection.description && (
              <p className="text-slate-500 mt-1">{collection.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-slate-500 font-mono">{collection.slug}</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  collection.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {collection.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
          >
            {showAddPanel ? (
              <>
                <X className="w-4 h-4" />
                Close
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Products
              </>
            )}
          </button>
        </div>
      </div>

      {/* Add Products Panel */}
      {showAddPanel && (
        <Card className="p-4">
          <h3 className="font-medium text-slate-900 mb-3">Search Products to Add</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by product name..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              autoFocus
            />
          </div>

          {searching && <p className="text-sm text-slate-500 mt-3">Searching...</p>}

          {searchResults.length > 0 && (
            <div className="mt-3 border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">
                      {product.base_price_ngn.toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                        minimumFractionDigits: 0,
                      })}
                      {" · "}
                      <span
                        className={
                          product.status === "active" ? "text-emerald-600" : "text-slate-400"
                        }
                      >
                        {product.status}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddProduct(product.id)}
                    disabled={adding === product.id}
                    className="px-3 py-1.5 text-xs font-medium bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 transition-colors disabled:opacity-50"
                  >
                    {adding === product.id ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && !searching && searchResults.length === 0 && (
            <p className="text-sm text-slate-500 mt-3">
              No products found matching &ldquo;{searchQuery}&rdquo;
            </p>
          )}
        </Card>
      )}

      {/* Current Products */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Products ({collection.products.length})
        </h2>

        {collection.products.length > 0 ? (
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-sm text-slate-600">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collection.products.map((product) => (
                  <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/store/products/${product.id}`}
                        className="font-medium text-cyan-600 hover:underline"
                      >
                        {product.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {product.base_price_ngn.toLocaleString("en-NG", {
                        style: "currency",
                        currency: "NGN",
                        minimumFractionDigits: 0,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          product.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveProduct(product.id, product.name)}
                        disabled={removing === product.id}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                        title="Remove from collection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">No products in this collection</h3>
            <p className="text-slate-500 mb-4">
              Add products to curate this collection for your store
            </p>
            <button
              onClick={() => setShowAddPanel(true)}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors font-medium"
            >
              Add Products
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
