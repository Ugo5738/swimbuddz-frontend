"use client";

import { AudioOverlayPanel } from "@/components/media/AudioOverlayPanel";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { MediaInput } from "@/components/ui/MediaInput";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Supplier {
  id: string;
  name: string;
  slug: string;
}

interface SuppliersResponse {
  items: Supplier[];
  total: number;
  page: number;
  page_size: number;
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

interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface ProductVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  is_processed: boolean;
  media_item_id: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  supplier_id: string | null;
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
  images: ProductImage[];
  videos: ProductVideo[];
}

interface ProductFormData {
  name: string;
  slug: string;
  category_id: string;
  supplier_id: string;
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Variant creation form state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    name: "",
    sku: "",
    price_override_ngn: "",
    weight_grams: "",
    options: "" as string, // JSON string or simple "Size: XL" format
  });

  // Image management state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showImageForm, setShowImageForm] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  // Video management state
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [audioOverlayVideoId, setAudioOverlayVideoId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, suppData, prod] = await Promise.all([
          apiGet<Category[]>("/api/v1/admin/store/categories", { auth: true }),
          apiGet<SuppliersResponse>("/api/v1/admin/store/suppliers?page_size=100", { auth: true }),
          apiGet<Product>(`/api/v1/admin/store/products/${productId}`, {
            auth: true,
          }),
        ]);
        setCategories(cats);
        setSuppliers(suppData.items);
        setProduct(prod);
        setVariants(prod.variants || []);
        setImages(prod.images || []);
        setVideos(prod.videos || []);
        setFormData({
          name: prod.name,
          slug: prod.slug,
          category_id: prod.category_id || "",
          supplier_id: prod.supplier_id || "",
          description: prod.description || "",
          short_description: prod.short_description || "",
          base_price_ngn: String(prod.base_price_ngn),
          compare_at_price_ngn: prod.compare_at_price_ngn ? String(prod.compare_at_price_ngn) : "",
          status: prod.status,
          is_featured: prod.is_featured,
          sourcing_type: prod.sourcing_type,
          preorder_lead_days: prod.preorder_lead_days ? String(prod.preorder_lead_days) : "",
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

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
        supplier_id: formData.supplier_id || null,
        size_chart_media_id: formData.size_chart_media_id || null,
        size_chart_url: formData.size_chart_url || null,
      };

      await apiPatch(`/api/v1/admin/store/products/${productId}`, payload, {
        auth: true,
      });
      toast.success("Product updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantForm.name) {
      toast.error("Variant name is required");
      return;
    }

    setSavingVariant(true);
    try {
      // Parse options from "Key: Value" lines into an object
      const options: Record<string, string> = {};
      if (variantForm.options.trim()) {
        variantForm.options
          .split("\n")
          .filter((line) => line.includes(":"))
          .forEach((line) => {
            const [key, ...rest] = line.split(":");
            options[key.trim()] = rest.join(":").trim();
          });
      }

      const payload: Record<string, unknown> = {
        name: variantForm.name,
        options,
      };

      // Only send SKU if user explicitly provided one
      if (variantForm.sku.trim()) {
        payload.sku = variantForm.sku.trim();
      }

      if (variantForm.price_override_ngn) {
        payload.price_override_ngn = parseFloat(variantForm.price_override_ngn);
      }
      if (variantForm.weight_grams) {
        payload.weight_grams = parseInt(variantForm.weight_grams);
      }

      const newVariant = await apiPost<Variant>(
        `/api/v1/admin/store/products/${productId}/variants`,
        payload,
        { auth: true }
      );

      setVariants((prev) => [...prev, newVariant]);
      setVariantForm({ name: "", sku: "", price_override_ngn: "", weight_grams: "", options: "" });
      setShowVariantForm(false);
      toast.success(`Variant created (SKU: ${newVariant.sku})`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create variant");
    } finally {
      setSavingVariant(false);
    }
  };

  const handleMediaUploaded = async (_mediaId: string | null, fileUrl?: string) => {
    if (!fileUrl) return;

    setSavingImage(true);
    try {
      const isPrimary = images.length === 0; // First image is auto-primary
      const payload = {
        url: fileUrl,
        alt_text: null,
        is_primary: isPrimary,
        sort_order: images.length,
      };

      const newImage = await apiPost<ProductImage>(
        `/api/v1/admin/store/products/${productId}/images`,
        payload,
        { auth: true }
      );

      setImages((prev) => [...prev, newImage]);
      setShowImageForm(false);
      toast.success("Image added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add image");
    } finally {
      setSavingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Remove this image?")) return;

    setDeletingImageId(imageId);
    try {
      await apiDelete(`/api/v1/admin/store/products/${productId}/images/${imageId}`, {
        auth: true,
      });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleVideoUploaded = async (mediaId: string | null, fileUrl?: string) => {
    if (!fileUrl) return;

    setSavingVideo(true);
    try {
      const payload = {
        url: fileUrl,
        thumbnail_url: null,
        title: null,
        sort_order: videos.length,
        media_item_id: mediaId || null,
      };

      const newVideo = await apiPost<ProductVideo>(
        `/api/v1/admin/store/products/${productId}/videos`,
        payload,
        { auth: true }
      );

      setVideos((prev) => [...prev, newVideo]);
      setShowVideoForm(false);
      toast.success("Video added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setSavingVideo(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Remove this video?")) return;

    setDeletingVideoId(videoId);
    try {
      await apiDelete(`/api/v1/admin/store/products/${productId}/videos/${videoId}`, {
        auth: true,
      });
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success("Video removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove video");
    } finally {
      setDeletingVideoId(null);
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Deactivate this variant? It will be hidden from customers.")) return;

    setDeletingVariantId(variantId);
    try {
      await apiDelete(`/api/v1/admin/store/products/${productId}/variants/${variantId}`, {
        auth: true,
      });
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      toast.success("Variant deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete variant");
    } finally {
      setDeletingVariantId(null);
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                  <option value="">No supplier</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Third-party supplier for this product</p>
              </div>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
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
              <h3 className="text-lg font-medium text-slate-900 mb-4">Pricing</h3>
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
              <h3 className="text-lg font-medium text-slate-900 mb-4">Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
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
                  <span className="text-sm text-slate-700">Featured product</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="requires_size_chart_ack"
                    checked={formData.requires_size_chart_ack}
                    onChange={handleChange}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span className="text-sm text-slate-700">Require size chart acknowledgment</span>
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
                          : null
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
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">
                Variants <span className="text-slate-400 font-normal">({variants.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowVariantForm(!showVariantForm)}
                className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
              >
                {showVariantForm ? "Cancel" : "+ Add"}
              </button>
            </div>

            {/* Add Variant Form */}
            {showVariantForm && (
              <form
                onSubmit={handleAddVariant}
                className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Variant Name *
                  </label>
                  <input
                    type="text"
                    value={variantForm.name}
                    onChange={(e) => setVariantForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. S, M, L or Red"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    SKU{" "}
                    <span className="font-normal text-slate-400">(auto-generated if empty)</span>
                  </label>
                  <input
                    type="text"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="Leave blank to auto-generate"
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Options{" "}
                    <span className="font-normal text-slate-400">(one per line, Key: Value)</span>
                  </label>
                  <textarea
                    value={variantForm.options}
                    onChange={(e) =>
                      setVariantForm((prev) => ({ ...prev, options: e.target.value }))
                    }
                    placeholder={"Size: L\nColor: Blue"}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Price Override (₦)
                    </label>
                    <input
                      type="number"
                      value={variantForm.price_override_ngn}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          price_override_ngn: e.target.value,
                        }))
                      }
                      min="0"
                      step="100"
                      placeholder="Base price"
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Weight (g)
                    </label>
                    <input
                      type="number"
                      value={variantForm.weight_grams}
                      onChange={(e) =>
                        setVariantForm((prev) => ({
                          ...prev,
                          weight_grams: e.target.value,
                        }))
                      }
                      min="0"
                      placeholder="Optional"
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingVariant}
                  className="w-full px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-md font-medium hover:bg-cyan-700 disabled:opacity-50"
                >
                  {savingVariant ? "Creating..." : "Create Variant"}
                </button>
              </form>
            )}

            {/* Existing Variants List */}
            {variants.length === 0 ? (
              <p className="text-sm text-slate-500">
                No variants yet. Add one to enable inventory tracking.
              </p>
            ) : (
              <div className="space-y-2">
                {variants.map((variant) => (
                  <div key={variant.id} className="p-3 bg-slate-50 rounded-lg group">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {variant.name || "Default"}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{variant.sku}</p>
                        {variant.price_override_ngn && (
                          <p className="text-xs text-slate-600 mt-0.5">
                            ₦{Number(variant.price_override_ngn).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                            (variant.quantity_available ?? variant.quantity_on_hand ?? 0) > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {variant.quantity_available ?? variant.quantity_on_hand ?? 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVariant(variant.id)}
                          disabled={deletingVariantId === variant.id}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity disabled:opacity-50"
                          title="Deactivate variant"
                        >
                          {deletingVariantId === variant.id ? "..." : "×"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Images Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">
                Images <span className="text-slate-400 font-normal">({images.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowImageForm(!showImageForm)}
                className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
              >
                {showImageForm ? "Cancel" : "+ Add"}
              </button>
            </div>

            {/* Add Image via MediaInput (upload or URL) */}
            {showImageForm && (
              <div className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg">
                {savingImage ? (
                  <p className="text-sm text-slate-500 text-center py-2">Saving to product...</p>
                ) : (
                  <MediaInput
                    purpose="product_image"
                    mode="both"
                    onChange={handleMediaUploaded}
                    showPreview={false}
                  />
                )}
              </div>
            )}

            {/* Existing Images */}
            {images.length === 0 ? (
              <p className="text-sm text-slate-500">No images yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text || "Product image"}
                      className="w-full aspect-square object-cover"
                    />
                    {img.is_primary && (
                      <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-cyan-600 text-white rounded font-medium">
                        Primary
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      disabled={deletingImageId === img.id}
                      className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                      title="Remove image"
                    >
                      {deletingImageId === img.id ? "..." : "×"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-slate-900">
                Videos <span className="text-slate-400 font-normal">({videos.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowVideoForm(!showVideoForm)}
                className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
              >
                {showVideoForm ? "Cancel" : "+ Add"}
              </button>
            </div>

            {/* Add Video via MediaInput */}
            {showVideoForm && (
              <div className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg">
                {savingVideo ? (
                  <p className="text-sm text-slate-500 text-center py-2">Saving to product...</p>
                ) : (
                  <MediaInput
                    purpose="product_video"
                    mode="both"
                    onChange={handleVideoUploaded}
                    showPreview={false}
                  />
                )}
              </div>
            )}

            {/* Existing Videos */}
            {videos.length === 0 ? (
              <p className="text-sm text-slate-500">
                No videos yet. Add product demos or features.
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((vid) => (
                  <div key={vid.id} className="space-y-2">
                    <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                      <video
                        src={vid.url}
                        className="w-full aspect-video object-cover bg-black"
                        controls
                        preload="metadata"
                      />
                      {!vid.is_processed && (
                        <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded font-medium">
                          Processing...
                        </span>
                      )}
                      {vid.title && (
                        <p className="px-2 py-1 text-xs text-slate-600 truncate">{vid.title}</p>
                      )}
                      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {vid.is_processed && vid.media_item_id && (
                          <button
                            type="button"
                            onClick={() =>
                              setAudioOverlayVideoId(audioOverlayVideoId === vid.id ? null : vid.id)
                            }
                            className={`w-5 h-5 flex items-center justify-center rounded-full text-xs transition-colors ${
                              audioOverlayVideoId === vid.id
                                ? "bg-cyan-500 text-white"
                                : "bg-slate-700/70 text-white hover:bg-cyan-600"
                            }`}
                            title="Audio overlay"
                          >
                            ♫
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(vid.id)}
                          disabled={deletingVideoId === vid.id}
                          className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600 disabled:opacity-50"
                          title="Remove video"
                        >
                          {deletingVideoId === vid.id ? "..." : "×"}
                        </button>
                      </div>
                    </div>

                    {/* Audio overlay panel for this video */}
                    {audioOverlayVideoId === vid.id && vid.media_item_id && (
                      <AudioOverlayPanel
                        mediaId={vid.media_item_id}
                        onApplied={() => {
                          toast.success("Audio overlay queued for processing");
                          setAudioOverlayVideoId(null);
                        }}
                      />
                    )}
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
