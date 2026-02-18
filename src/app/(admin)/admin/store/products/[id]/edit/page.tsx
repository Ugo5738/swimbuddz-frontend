"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { apiGet, apiPatch, apiPost, apiDelete } from "@/lib/api";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { MediaInput } from "@/components/ui/MediaInput";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Variant {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price_override_ngn: number | null;
  is_active: boolean;
  quantity_available?: number;
  quantity_on_hand?: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  description: string | null;
  short_description: string | null;
  base_price_ngn: number;
  compare_at_price_ngn: number | null;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  preorder_lead_days: number | null;
  has_variants: boolean;
  requires_size_chart_ack: boolean;
  size_chart_url: string | null;
  size_chart_media_id: string | null;
  variants: Variant[];
}

interface ProductFormData {
  name: string;
  slug: string;
  category_id: string;
  description: string;
  short_description: string;
  base_price_ngn: string;
  compare_at_price_ngn: string;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  preorder_lead_days: string;
  has_variants: boolean;
  requires_size_chart_ack: boolean;
  size_chart_url: string;
  size_chart_media_id: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, prod] = await Promise.all([
          apiGet<Category[]>("/api/v1/store/admin/categories", { auth: true }),
          apiGet<Product>(`/api/v1/store/admin/products/${productId}`, {
            auth: true,
          }),
        ]);
        setCategories(cats);
        setProduct(prod);
        setVariants(prod.variants || []);
        setFormData({
          name: prod.name,
          slug: prod.slug,
          category_id: prod.category_id || "",
          description: prod.description || "",
          short_description: prod.short_description || "",
          base_price_ngn: String(prod.base_price_ngn),
          compare_at_price_ngn: prod.compare_at_price_ngn
            ? String(prod.compare_at_price_ngn)
            : "",
          status: prod.status,
          is_featured: prod.is_featured,
          sourcing_type: prod.sourcing_type,
          preorder_lead_days: prod.preorder_lead_days
            ? String(prod.preorder_lead_days)
            : "",
          has_variants: prod.has_variants,
          requires_size_chart_ack: prod.requires_size_chart_ack,
          size_chart_url: prod.size_chart_url || "",
          size_chart_media_id: prod.size_chart_media_id || "",
        });
      } catch {
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [productId]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const target = e.target;
    const name = target.name;
    const value =
      target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;

    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (!formData.name || !formData.base_price_ngn) {
      toast.error("Name and price are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        base_price_ngn: parseFloat(formData.base_price_ngn),
        compare_at_price_ngn: formData.compare_at_price_ngn
          ? parseFloat(formData.compare_at_price_ngn)
          : null,
        preorder_lead_days: formData.preorder_lead_days
          ? parseInt(formData.preorder_lead_days)
          : null,
        category_id: formData.category_id || null,
      };

      await apiPatch(`/api/v1/store/admin/products/${productId}`, payload, {
        auth: true,
      });
      toast.success("Product updated successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update product",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return <LoadingCard text="Loading product..." />;
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
        >
          ← Back to Products
        </button>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit Product</h1>
        <p className="text-slate-500">{product?.name}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Short Description
              </label>
              <input
                type="text"
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                maxLength={500}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>

            {/* Pricing */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Price (₦) *
                  </label>
                  <input
                    type="number"
                    name="base_price_ngn"
                    value={formData.base_price_ngn}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Compare at Price (₦)
                  </label>
                  <input
                    type="number"
                    name="compare_at_price_ngn"
                    value={formData.compare_at_price_ngn}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Sourcing Type
                  </label>
                  <select
                    name="sourcing_type"
                    value={formData.sourcing_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  >
                    <option value="stocked">Stocked</option>
                    <option value="preorder">Pre-order</option>
                  </select>
                </div>
              </div>

              {formData.sourcing_type === "preorder" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Pre-order Lead Days
                  </label>
                  <input
                    type="number"
                    name="preorder_lead_days"
                    value={formData.preorder_lead_days}
                    onChange={handleChange}
                    min="1"
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={formData.is_featured}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700">
                    Featured product
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="requires_size_chart_ack"
                    checked={formData.requires_size_chart_ack}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700">
                    Require size chart acknowledgment
                  </span>
                </label>
              </div>

              {formData.requires_size_chart_ack && (
                <div className="mt-4">
                  <MediaInput
                    label="Size Chart"
                    purpose="size_chart"
                    mode="both"
                    value={formData.size_chart_media_id || null}
                    onChange={(mediaId, fileUrl) =>
                      setFormData((prev) =>
                        prev
                          ? {
                              ...prev,
                              size_chart_media_id: mediaId || "",
                              size_chart_url: fileUrl || "",
                            }
                          : null,
                      )
                    }
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-6 border-t border-slate-200 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Variants Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-medium text-slate-900 mb-4">
              Variants & Inventory
            </h3>
            {variants.length === 0 ? (
              <p className="text-sm text-slate-500">No variants yet.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((variant) => (
                  <div key={variant.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-slate-900">
                          {variant.name || "Default"}
                        </p>
                        <p className="text-xs text-slate-500">{variant.sku}</p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          (variant.quantity_available || 0) > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {variant.quantity_available || 0} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
