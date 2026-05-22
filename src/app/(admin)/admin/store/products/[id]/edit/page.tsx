"use client";

import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { BasicInfoSection } from "./_edit/BasicInfoSection";
import { ImagesCard } from "./_edit/ImagesCard";
import { PricingSection } from "./_edit/PricingSection";
import { SettingsSection } from "./_edit/SettingsSection";
import { VariantOptionsEditor } from "./_edit/VariantOptionsEditor";
import { VariantsSidebar } from "./_edit/VariantsSidebar";
import { VideosCard } from "./_edit/VideosCard";
import type {
  Category,
  Product,
  ProductFormData,
  ProductImage,
  ProductVideo,
  Supplier,
  SuppliersResponse,
  Variant,
} from "./types";

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

  // Variant form state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [savingVariant, setSavingVariant] = useState(false);
  const [deletingVariantId, setDeletingVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    name: "",
    sku: "",
    price_override_ngn: "",
    weight_grams: "",
    options: "" as string,
  });

  // Image management state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [showImageForm, setShowImageForm] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [replacingImageId, setReplacingImageId] = useState<string | null>(null);

  // Video management state
  const [videos, setVideos] = useState<ProductVideo[]>([]);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [audioOverlayVideoId, setAudioOverlayVideoId] = useState<string | null>(null);

  // Variant options editor state
  const [variantOptions, setVariantOptions] = useState<Record<string, string[]>>({});
  const [colorSwatches, setColorSwatches] = useState<Record<string, string>>({});
  const [newDimensionName, setNewDimensionName] = useState("");
  const [newValueInputs, setNewValueInputs] = useState<Record<string, string>>({});

  // Image ↔ variant linking state
  const [linkingImageId, setLinkingImageId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [cats, suppData, prod] = await Promise.all([
          apiGet<Category[]>("/api/v1/admin/store/categories", { auth: true }),
          apiGet<SuppliersResponse>("/api/v1/admin/store/suppliers?page_size=100", { auth: true }),
          apiGet<Product>(`/api/v1/admin/store/products/${productId}`, { auth: true }),
        ]);
        setCategories(cats);
        setSuppliers(suppData.items);
        setProduct(prod);
        setVariants(prod.variants || []);
        setImages(
          (prod.images || [])
            .slice()
            .sort((a: ProductImage, b: ProductImage) => a.sort_order - b.sort_order),
        );
        setVideos(prod.videos || []);

        // Parse variant_options: separate _color_swatches from real dimensions
        if (prod.variant_options && typeof prod.variant_options === "object") {
          const opts: Record<string, string[]> = {};
          let swatches: Record<string, string> = {};
          for (const [key, val] of Object.entries(prod.variant_options)) {
            if (
              key === "_color_swatches" &&
              val &&
              typeof val === "object" &&
              !Array.isArray(val)
            ) {
              swatches = val as Record<string, string>;
            } else if (Array.isArray(val)) {
              opts[key] = val as string[];
            }
          }
          setVariantOptions(opts);
          setColorSwatches(swatches);
        }

        setFormData({
          name: prod.name,
          slug: prod.slug,
          category_id: prod.category_id || "",
          supplier_id: prod.supplier_id || "",
          description: prod.description || "",
          short_description: prod.short_description || "",
          base_price_ngn: String(prod.base_price_ngn),
          compare_at_price_ngn: prod.compare_at_price_ngn
            ? String(prod.compare_at_price_ngn)
            : "",
          status: prod.status,
          is_featured: prod.is_featured,
          sourcing_type: prod.sourcing_type,
          preorder_lead_days: prod.preorder_lead_days ? String(prod.preorder_lead_days) : "",
          has_variants: prod.has_variants,
          requires_size_chart_ack: prod.requires_size_chart_ack,
          size_chart_url: prod.size_chart_url || "",
          size_chart_media_id: prod.size_chart_media_id || "",
          cost_price_ngn: prod.cost_price_ngn ? String(prod.cost_price_ngn) : "",
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
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
      // Build variant_options JSONB: merge real dimensions + _color_swatches
      let builtVariantOptions: Record<string, unknown> | null = null;
      if (Object.keys(variantOptions).length > 0) {
        builtVariantOptions = { ...variantOptions };
        if (Object.keys(colorSwatches).length > 0) {
          builtVariantOptions._color_swatches = colorSwatches;
        }
      }

      const payload = {
        ...formData,
        base_price_ngn: parseFloat(formData.base_price_ngn),
        compare_at_price_ngn: formData.compare_at_price_ngn
          ? parseFloat(formData.compare_at_price_ngn)
          : null,
        cost_price_ngn: formData.cost_price_ngn ? parseFloat(formData.cost_price_ngn) : null,
        preorder_lead_days: formData.preorder_lead_days
          ? parseInt(formData.preorder_lead_days)
          : null,
        category_id: formData.category_id || null,
        supplier_id: formData.supplier_id || null,
        size_chart_media_id: formData.size_chart_media_id || null,
        size_chart_url: formData.size_chart_url || null,
        variant_options: builtVariantOptions,
      };

      await apiPatch(`/api/v1/admin/store/products/${productId}`, payload, { auth: true });
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
        { auth: true },
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

  // ─── Variant Options Handlers ───
  const handleAddDimension = () => {
    const name = newDimensionName.trim();
    if (!name) return;
    if (variantOptions[name]) {
      toast.error(`Dimension "${name}" already exists`);
      return;
    }
    setVariantOptions((prev) => ({ ...prev, [name]: [] }));
    setNewDimensionName("");
  };

  const handleRemoveDimension = (dim: string) => {
    if (!confirm(`Remove dimension "${dim}" and all its values?`)) return;
    setVariantOptions((prev) => {
      const next = { ...prev };
      delete next[dim];
      return next;
    });
    if (dim.toLowerCase() === "color") {
      setColorSwatches({});
    }
    setNewValueInputs((prev) => {
      const next = { ...prev };
      delete next[dim];
      return next;
    });
  };

  const handleAddValue = (dim: string) => {
    const val = (newValueInputs[dim] || "").trim();
    if (!val) return;
    if (variantOptions[dim]?.includes(val)) {
      toast.error(`"${val}" already exists in ${dim}`);
      return;
    }
    setVariantOptions((prev) => ({
      ...prev,
      [dim]: [...(prev[dim] || []), val],
    }));
    setNewValueInputs((prev) => ({ ...prev, [dim]: "" }));
  };

  const handleRemoveValue = (dim: string, val: string) => {
    setVariantOptions((prev) => ({
      ...prev,
      [dim]: (prev[dim] || []).filter((v) => v !== val),
    }));
    if (dim.toLowerCase() === "color") {
      setColorSwatches((prev) => {
        const next = { ...prev };
        delete next[val];
        return next;
      });
    }
  };

  const handleSwatchChange = (colorName: string, url: string) => {
    setColorSwatches((prev) => {
      if (!url) {
        const next = { ...prev };
        delete next[colorName];
        return next;
      }
      return { ...prev, [colorName]: url };
    });
  };

  // ─── Image Drag-to-Reorder ───
  const handleImageDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically reorder in UI
      const reordered = arrayMove(images, oldIndex, newIndex);
      setImages(reordered);

      // Persist new sort_order values to backend
      try {
        await Promise.all(
          reordered.map((img, idx) =>
            apiPatch(
              `/api/v1/admin/store/products/${productId}/images/${img.id}`,
              { sort_order: idx },
              { auth: true },
            ),
          ),
        );
        toast.success("Image order updated");
      } catch (error) {
        console.error("Failed to reorder images", error);
        toast.error("Failed to save image order");
      }
    },
    [images, productId],
  );

  // ─── Image ↔ Variant Linking ───
  const handleLinkImageToVariant = async (imageId: string, variantId: string | null) => {
    try {
      const updated = await apiPatch<ProductImage>(
        `/api/v1/admin/store/products/${productId}/images/${imageId}`,
        { variant_id: variantId },
        { auth: true },
      );
      setImages((prev) => prev.map((img) => (img.id === imageId ? updated : img)));
      setLinkingImageId(null);
      toast.success(variantId ? "Image linked to variant" : "Image unlinked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to link image");
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
        { auth: true },
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

  const handleSetPrimary = async (imageId: string) => {
    try {
      await apiPatch(
        `/api/v1/admin/store/products/${productId}/images/${imageId}`,
        { is_primary: true },
        { auth: true },
      );
      setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
      toast.success("Primary image updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set primary image");
    }
  };

  const handleReplaceImage = async (_mediaId: string | null, fileUrl?: string) => {
    if (!fileUrl || !replacingImageId) return;

    setSavingImage(true);
    try {
      const updated = await apiPatch<ProductImage>(
        `/api/v1/admin/store/products/${productId}/images/${replacingImageId}`,
        { url: fileUrl },
        { auth: true },
      );
      setImages((prev) => prev.map((img) => (img.id === replacingImageId ? updated : img)));
      setReplacingImageId(null);
      toast.success("Image replaced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to replace image");
    } finally {
      setSavingImage(false);
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
        { auth: true },
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
            <BasicInfoSection
              formData={formData}
              categories={categories}
              suppliers={suppliers}
              onChange={handleChange}
            />

            <PricingSection formData={formData} onChange={handleChange} />

            <SettingsSection
              formData={formData}
              setFormData={setFormData}
              onChange={handleChange}
            />

            {formData.has_variants && (
              <VariantOptionsEditor
                variantOptions={variantOptions}
                colorSwatches={colorSwatches}
                newDimensionName={newDimensionName}
                setNewDimensionName={setNewDimensionName}
                newValueInputs={newValueInputs}
                setNewValueInputs={setNewValueInputs}
                onAddDimension={handleAddDimension}
                onRemoveDimension={handleRemoveDimension}
                onAddValue={handleAddValue}
                onRemoveValue={handleRemoveValue}
                onSwatchChange={handleSwatchChange}
              />
            )}

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

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <VariantsSidebar
            variants={variants}
            showVariantForm={showVariantForm}
            setShowVariantForm={setShowVariantForm}
            variantForm={variantForm}
            setVariantForm={setVariantForm}
            onAddVariant={handleAddVariant}
            onDeleteVariant={handleDeleteVariant}
            savingVariant={savingVariant}
            deletingVariantId={deletingVariantId}
          />

          <ImagesCard
            images={images}
            variants={variants}
            showImageForm={showImageForm}
            setShowImageForm={setShowImageForm}
            savingImage={savingImage}
            deletingImageId={deletingImageId}
            replacingImageId={replacingImageId}
            setReplacingImageId={setReplacingImageId}
            linkingImageId={linkingImageId}
            setLinkingImageId={setLinkingImageId}
            onImageUploaded={handleMediaUploaded}
            onReplaceImage={handleReplaceImage}
            onDeleteImage={handleDeleteImage}
            onSetPrimary={handleSetPrimary}
            onLinkImageToVariant={handleLinkImageToVariant}
            onImageDragEnd={handleImageDragEnd}
          />

          <VideosCard
            videos={videos}
            showVideoForm={showVideoForm}
            setShowVideoForm={setShowVideoForm}
            savingVideo={savingVideo}
            deletingVideoId={deletingVideoId}
            audioOverlayVideoId={audioOverlayVideoId}
            setAudioOverlayVideoId={setAudioOverlayVideoId}
            onVideoUploaded={handleVideoUploaded}
            onDeleteVideo={handleDeleteVideo}
          />
        </div>
      </div>
    </div>
  );
}
