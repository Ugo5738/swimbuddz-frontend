"use client";

import { ProductCard } from "@/components/store/ProductCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { useStoreCart } from "@/lib/storeCart";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  Minus,
  Package,
  Play,
  Plus,
  Shield,
  ShoppingCart,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ProductVariant {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  price_override_ngn: number | null;
  is_active: boolean;
  inventory?: {
    quantity_available: number;
  };
}

interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  variant_id: string | null;
}

interface ProductVideo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  is_processed: boolean;
  sort_order: number;
}

/** Unified media item for the gallery (image or video). */
interface GalleryItem {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
  type: "image" | "video";
  thumbnail_url?: string | null;
  variant_id?: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  base_price_ngn: number;
  compare_at_price_ngn: number | null;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  preorder_lead_days: number | null;
  requires_size_chart_ack: boolean;
  size_chart_url: string | null;
  variant_options: (Record<string, string[]> & { _color_swatches?: Record<string, string> }) | null;
  images: ProductImage[];
  videos: ProductVideo[];
  variants: ProductVariant[];
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  base_price_ngn: number;
  compare_at_price_ngn: number | null;
  status: string;
  is_featured: boolean;
  sourcing_type: string;
  images: { url: string; is_primary: boolean }[];
  default_variant?: { id: string; sku: string };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, itemCount, isAuthenticated } = useStoreCart();
  const slug = params.slug as string;

  /* ---- state ---- */
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [sizeChartAcked, setSizeChartAcked] = useState(false);
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [activeTab, setActiveTab] = useState<"description" | "details">("description");
  const thumbStripRef = useRef<HTMLDivElement>(null);

  /* ---- data loading ---- */
  const loadProduct = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ProductDetail>(`/api/v1/store/products/${slug}`);
      setProduct(data);

      // Auto-select only if exactly one variant (no choice needed)
      if (data.variants.length === 1) {
        const onlyVariant = data.variants[0];
        setSelectedVariant(onlyVariant);
        setSelectedOptions(onlyVariant.options);
      } else if (data.variants.length > 1) {
        // Don't auto-select — user must choose options
        setSelectedVariant(null);
        setSelectedOptions({});
      }

      // Load related products from same category
      if (data.category) {
        try {
          const related = await apiGet<{ items: RelatedProduct[] }>(
            `/api/v1/store/products?category=${data.category.slug}&page_size=4`
          );
          setRelatedProducts(related.items.filter((p) => p.slug !== data.slug).slice(0, 4));
        } catch {
          // Gracefully degrade
        }
      }

      // Get member discount
      if (isAuthenticated) {
        try {
          const member = await apiGet<{ membership?: { tier?: string } }>("/api/v1/members/me", {
            auth: true,
          });
          const tier = member?.membership?.tier;
          if (tier === "academy") setMemberDiscount(15);
          else if (tier === "club") setMemberDiscount(10);
          else if (tier === "community") setMemberDiscount(5);
        } catch {
          // Ignore
        }
      }
    } catch (e) {
      console.error("Failed to load product:", e);
      toast.error("Product not found");
      router.push("/store");
    } finally {
      setLoading(false);
    }
  }, [slug, isAuthenticated, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  // Build gallery items once (images + videos, sorted) for display and variant switching.
  // Order: Primary → Detail images (no variant) → Variant images → Videos
  const galleryItems: GalleryItem[] = useMemo(() => {
    if (!product) return [];

    // Categorise images
    const primary: GalleryItem[] = [];
    const details: GalleryItem[] = [];
    const variants: GalleryItem[] = [];

    for (const img of product.images) {
      const item: GalleryItem = {
        id: img.id,
        url: img.url,
        alt_text: img.alt_text,
        is_primary: img.is_primary,
        sort_order: img.sort_order,
        type: "image" as const,
        variant_id: img.variant_id,
      };
      if (img.is_primary) primary.push(item);
      else if (img.variant_id) variants.push(item);
      else details.push(item);
    }

    // Sort each group by sort_order
    const bySortOrder = (a: GalleryItem, b: GalleryItem) => a.sort_order - b.sort_order;
    primary.sort(bySortOrder);
    details.sort(bySortOrder);
    variants.sort(bySortOrder);

    // Videos always last
    const videos: GalleryItem[] = (product.videos || [])
      .filter((v) => v.is_processed)
      .map((vid) => ({
        id: vid.id,
        url: vid.url,
        alt_text: vid.title,
        is_primary: false,
        sort_order: vid.sort_order,
        type: "video" as const,
        thumbnail_url: vid.thumbnail_url,
      }))
      .sort(bySortOrder);

    return [...primary, ...details, ...variants, ...videos];
  }, [product]);

  // Update selected variant when options change + jump gallery to variant image
  useEffect(() => {
    if (!product) return;
    const matchingVariant = product.variants.find((v) =>
      Object.entries(selectedOptions).every(([key, value]) => v.options[key] === value)
    );
    if (matchingVariant) {
      setSelectedVariant(matchingVariant);

      // Jump gallery to the first image linked to this variant
      const variantImageIdx = galleryItems.findIndex(
        (item) => item.variant_id === matchingVariant.id
      );
      if (variantImageIdx >= 0) {
        setSelectedImage(variantImageIdx);
      }
    }
  }, [selectedOptions, product, galleryItems]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
  };

  // Check if all variant options have been selected
  const requiredOptions = product
    ? Object.keys(product.variant_options || {}).filter((k) => !k.startsWith("_"))
    : [];
  const allOptionsSelected =
    requiredOptions.length === 0 || requiredOptions.every((key) => selectedOptions[key]);
  const missingOptions = requiredOptions.filter((key) => !selectedOptions[key]);

  const handleAddToCart = async () => {
    if (!selectedVariant || !allOptionsSelected) {
      toast.error(`Please select ${missingOptions.join(" and ")}`);
      return;
    }
    if (product?.requires_size_chart_ack && !sizeChartAcked) {
      toast.error("Please acknowledge the size chart");
      return;
    }
    const stock = selectedVariant.inventory?.quantity_available ?? 999;
    if (stock <= 0 && product?.sourcing_type !== "preorder") {
      toast.error("Out of stock");
      return;
    }

    setAdding(true);
    try {
      await addItem(selectedVariant.id, quantity);
      toast.success(`${product?.name} added to cart`);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  /* ---- loading / not found ---- */
  if (loading) return <LoadingCard text="Loading product..." />;
  if (!product) return null;

  /* ---- derived values ---- */

  const basePrice = selectedVariant?.price_override_ngn ?? product.base_price_ngn;
  const finalPrice = memberDiscount > 0 ? basePrice * (1 - memberDiscount / 100) : basePrice;
  const hasDiscount = product.compare_at_price_ngn && product.compare_at_price_ngn > basePrice;
  const isPreorder = product.sourcing_type === "preorder";
  const stock = selectedVariant?.inventory?.quantity_available ?? 999;
  const inStock = stock > 0 || isPreorder;

  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_at_price_ngn! - basePrice) / product.compare_at_price_ngn!) * 100
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* ============================================================ */}
      {/* BREADCRUMBS                                                  */}
      {/* ============================================================ */}
      <nav className="flex items-center gap-1.5 py-4 text-sm text-slate-500 overflow-x-auto">
        <Link href="/store" className="hover:text-cyan-600 whitespace-nowrap">
          Store
        </Link>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        {product.category && (
          <>
            <Link
              href={`/store?category=${product.category.slug}`}
              className="hover:text-cyan-600 whitespace-nowrap"
            >
              {product.category.name}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          </>
        )}
        <span className="text-slate-800 font-medium truncate">{product.name}</span>
      </nav>

      {/* ============================================================ */}
      {/* PRODUCT MAIN SECTION                                         */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* ---------------------------------------------------------- */}
        {/* IMAGE GALLERY (Alibaba-style: thumbs left, main right)     */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          {/* Vertical Thumbnail Strip (left side on desktop, bottom on mobile) */}
          {galleryItems.length > 1 && (
            <div className="sm:flex sm:flex-col items-center gap-1.5 flex-shrink-0">
              {/* Scroll up button (desktop only) */}
              <button
                onClick={() => {
                  thumbStripRef.current?.scrollBy({ top: -160, behavior: "smooth" });
                }}
                className="hidden sm:flex w-[72px] h-6 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Scroll thumbnails up"
              >
                <ChevronUp className="w-4 h-4 text-slate-500" />
              </button>

              {/* Thumbnails container */}
              <div
                ref={thumbStripRef}
                className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:overflow-x-hidden sm:max-h-[420px] pb-1 sm:pb-0 scrollbar-hide"
              >
                {galleryItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedImage(idx)}
                    onMouseEnter={() => setSelectedImage(idx)}
                    className={`relative w-16 h-16 sm:w-[72px] sm:h-[72px] flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx
                        ? "border-cyan-500 ring-2 ring-cyan-200"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {item.type === "video" ? (
                      <>
                        {item.thumbnail_url ? (
                          <Image
                            src={item.thumbnail_url}
                            alt={item.alt_text || `Video ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                            <Play className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-3 h-3 text-slate-900 ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <Image
                        src={item.url}
                        alt={item.alt_text || `${product.name} ${idx + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Scroll down button (desktop only) */}
              <button
                onClick={() => {
                  thumbStripRef.current?.scrollBy({ top: 160, behavior: "smooth" });
                }}
                className="hidden sm:flex w-[72px] h-6 items-center justify-center rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                aria-label="Scroll thumbnails down"
              >
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}

          {/* Main Image / Video */}
          <div className="relative aspect-square bg-white rounded-2xl overflow-hidden group flex-1 min-w-0">
            {galleryItems.length > 0 ? (
              galleryItems[selectedImage]?.type === "video" ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  key={galleryItems[selectedImage]?.id}
                  src={galleryItems[selectedImage]?.url}
                  controls
                  className="w-full h-full object-contain bg-black"
                  poster={galleryItems[selectedImage]?.thumbnail_url || undefined}
                />
              ) : (
                <Image
                  src={galleryItems[selectedImage]?.url}
                  alt={galleryItems[selectedImage]?.alt_text || product.name}
                  fill
                  unoptimized
                  className="object-contain transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Package className="w-20 h-20" />
                <span className="text-sm mt-2">No image available</span>
              </div>
            )}

            {/* Prev / Next Arrows */}
            {galleryItems.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setSelectedImage((prev) => (prev === 0 ? galleryItems.length - 1 : prev - 1))
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-700" />
                </button>
                <button
                  onClick={() =>
                    setSelectedImage((prev) => (prev === galleryItems.length - 1 ? 0 : prev + 1))
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5 text-slate-700" />
                </button>
              </>
            )}

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {isPreorder && (
                <span className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-full shadow-sm">
                  Pre-order
                </span>
              )}
              {hasDiscount && (
                <span className="px-3 py-1.5 text-xs font-semibold bg-rose-500 text-white rounded-full shadow-sm">
                  -{discountPercent}%
                </span>
              )}
              {memberDiscount > 0 && (
                <span className="px-3 py-1.5 text-xs font-semibold bg-emerald-500 text-white rounded-full shadow-sm">
                  Member -{memberDiscount}%
                </span>
              )}
            </div>

            {/* Media counter */}
            {galleryItems.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/50 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                {selectedImage + 1} / {galleryItems.length}
              </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* PRODUCT INFO                                               */}
        {/* ---------------------------------------------------------- */}
        <div className="flex flex-col">
          {/* Category link */}
          {product.category && (
            <Link
              href={`/store?category=${product.category.slug}`}
              className="text-xs font-semibold tracking-wider text-cyan-600 uppercase hover:text-cyan-700 transition-colors mb-2"
            >
              {product.category.name}
            </Link>
          )}

          {/* Product name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
            {product.name}
          </h1>

          {/* SKU */}
          {selectedVariant && (
            <p className="text-xs text-slate-400 mt-1 font-mono">SKU: {selectedVariant.sku}</p>
          )}

          {/* Price block */}
          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              ₦{finalPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="text-lg text-slate-400 line-through">
                ₦{product.compare_at_price_ngn!.toLocaleString()}
              </span>
            )}
            {memberDiscount > 0 && !hasDiscount && (
              <span className="text-lg text-slate-400 line-through">
                ₦{basePrice.toLocaleString()}
              </span>
            )}
            {(hasDiscount || memberDiscount > 0) && (
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                You save ₦
                {(
                  basePrice -
                  finalPrice +
                  (hasDiscount ? product.compare_at_price_ngn! - basePrice : 0)
                ).toLocaleString()}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="mt-3 flex items-center gap-2">
            {inStock ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium text-emerald-600">
                  {isPreorder
                    ? `Available for pre-order · Ships in ${product.preorder_lead_days || 14} days`
                    : stock <= 5
                      ? `Only ${stock} left in stock`
                      : "In stock"}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm font-medium text-slate-500">Out of stock</span>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100 my-5" />

          {/* Short description */}
          {product.short_description && (
            <p className="text-slate-600 text-sm leading-relaxed mb-5">
              {product.short_description}
            </p>
          )}

          {/* Variant Options */}
          {product.variant_options && Object.keys(product.variant_options).length > 0 && (
            <div className="space-y-4 mb-5">
              {Object.entries(product.variant_options)
                .filter(([key]) => !key.startsWith("_"))
                .map(([optionName, values]) => {
                  const isColorOption = optionName.toLowerCase() === "color";
                  const swatches =
                    isColorOption && product.variant_options
                      ? ((product.variant_options as Record<string, unknown>)._color_swatches as
                          | Record<string, string>
                          | undefined)
                      : undefined;

                  return (
                    <div key={optionName}>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {optionName}
                        {selectedOptions[optionName] && (
                          <span className="text-slate-400 font-normal ml-1">
                            — {selectedOptions[optionName]}
                          </span>
                        )}
                      </label>

                      {isColorOption ? (
                        /* ── Temu-style color swatch selector ── */
                        <div className="flex flex-wrap gap-2">
                          {(values as string[]).map((value) => {
                            const isSelected = selectedOptions[optionName] === value;
                            const isAvailable = product.variants.some(
                              (v) => v.options[optionName] === value && v.is_active
                            );
                            const swatchUrl = swatches?.[value];

                            return (
                              <button
                                key={value}
                                onClick={() => handleOptionChange(optionName, value)}
                                disabled={!isAvailable}
                                title={value}
                                className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                                  isSelected
                                    ? "border-cyan-500 ring-2 ring-cyan-200 shadow-sm"
                                    : isAvailable
                                      ? "border-slate-200 hover:border-cyan-400"
                                      : "border-slate-100 opacity-40 cursor-not-allowed"
                                } ${swatchUrl ? "w-16 h-16" : "px-4 py-2"}`}
                              >
                                {swatchUrl ? (
                                  <Image
                                    src={swatchUrl}
                                    alt={value}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                ) : (
                                  <span
                                    className={`text-sm font-medium ${
                                      isSelected ? "text-cyan-700" : "text-slate-700"
                                    }`}
                                  >
                                    {value}
                                  </span>
                                )}
                                {isSelected && swatchUrl && (
                                  <div className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                                    <svg
                                      className="w-2.5 h-2.5 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        /* ── Text button selector (Size, etc.) ── */
                        <div className="flex flex-wrap gap-2">
                          {(values as string[]).map((value) => {
                            const isSelected = selectedOptions[optionName] === value;
                            const isAvailable = product.variants.some(
                              (v) => v.options[optionName] === value && v.is_active
                            );
                            return (
                              <button
                                key={value}
                                onClick={() => handleOptionChange(optionName, value)}
                                disabled={!isAvailable}
                                className={`px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all ${
                                  isSelected
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                                    : isAvailable
                                      ? "bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-700"
                                      : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                                }`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {/* Size Chart Acknowledgment */}
          {product.requires_size_chart_ack && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-5">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sizeChartAcked}
                  onChange={(e) => setSizeChartAcked(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded border-amber-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-amber-800 leading-relaxed">
                  I have reviewed the{" "}
                  {product.size_chart_url ? (
                    <a
                      href={product.size_chart_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 underline font-medium"
                    >
                      size chart
                    </a>
                  ) : (
                    "size chart"
                  )}{" "}
                  and understand that swimwear sizing may vary. All sales are final.
                </span>
              </label>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="flex items-center gap-3">
            <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4 text-slate-600" />
              </button>
              <span className="w-12 text-center font-semibold text-slate-900 tabular-nums">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                className="p-3 hover:bg-slate-50 transition-colors active:bg-slate-100"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={adding || !inStock || !allOptionsSelected}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-cyan-600 text-white rounded-xl font-semibold text-sm hover:bg-cyan-700 active:bg-cyan-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {adding ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Adding...
                </span>
              ) : !allOptionsSelected ? (
                <>Select {missingOptions.join(" & ")}</>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" />
                  {isPreorder ? "Pre-order Now" : "Add to Cart"}
                </>
              )}
            </button>
          </div>

          {/* Cart link */}
          {itemCount > 0 && (
            <Link
              href="/store/cart"
              className="mt-3 flex items-center justify-center gap-2 text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              View Cart ({itemCount} {itemCount === 1 ? "item" : "items"})
            </Link>
          )}

          {/* Trust indicators */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Free Pool Pickup</p>
                <p className="text-[11px] text-slate-500">At any session</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <Shield className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Secure Payment</p>
                <p className="text-[11px] text-slate-500">via Paystack</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <Clock className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Quick Processing</p>
                <p className="text-[11px] text-slate-500">1–3 business days</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
              <Truck className="w-4 h-4 text-cyan-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Lagos Delivery</p>
                <p className="text-[11px] text-slate-500">Flat rate available</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DESCRIPTION & DETAILS TABS                                   */}
      {/* ============================================================ */}
      {(product.description || selectedVariant) && (
        <section className="mt-12 border-t border-slate-100 pt-8">
          {/* Tab buttons */}
          <div className="flex gap-6 border-b border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "description"
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Description
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === "details"
                  ? "border-cyan-600 text-cyan-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Product Details
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "description" && product.description && (
            <div className="prose prose-slate prose-sm max-w-3xl">
              {product.description.split("\n").map((p, i) => (
                <p key={i} className="text-slate-600 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}

          {activeTab === "details" && (
            <div className="max-w-xl">
              <dl className="divide-y divide-slate-100">
                {selectedVariant && (
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-slate-500">SKU</dt>
                    <dd className="text-slate-900 font-mono">{selectedVariant.sku}</dd>
                  </div>
                )}
                {product.category && (
                  <div className="py-3 flex justify-between text-sm">
                    <dt className="text-slate-500">Category</dt>
                    <dd className="text-slate-900">{product.category.name}</dd>
                  </div>
                )}
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-slate-500">Availability</dt>
                  <dd className="text-slate-900">
                    {isPreorder
                      ? `Pre-order (${product.preorder_lead_days || 14} day lead time)`
                      : inStock
                        ? "In stock"
                        : "Out of stock"}
                  </dd>
                </div>
                {product.variant_options &&
                  Object.entries(product.variant_options)
                    .filter(([key]) => !key.startsWith("_"))
                    .map(([key, values]) => (
                      <div key={key} className="py-3 flex justify-between text-sm">
                        <dt className="text-slate-500">{key}</dt>
                        <dd className="text-slate-900">
                          {Array.isArray(values) ? values.join(", ") : ""}
                        </dd>
                      </div>
                    ))}
                <div className="py-3 flex justify-between text-sm">
                  <dt className="text-slate-500">Fulfillment</dt>
                  <dd className="text-slate-900">Pool pickup or Lagos delivery</dd>
                </div>
              </dl>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* RELATED PRODUCTS                                             */}
      {/* ============================================================ */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 border-t border-slate-100 pt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">You may also like</h2>
            {product.category && (
              <Link
                href={`/store?category=${product.category.slug}`}
                className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.id} product={rp} memberDiscountPercent={memberDiscount} />
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* MOBILE STICKY ADD TO CART BAR                                */}
      {/* ============================================================ */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center gap-3 lg:hidden z-50">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
          <p className="text-sm font-bold text-cyan-700">₦{finalPrice.toLocaleString()}</p>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={adding || !inStock}
          className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-semibold text-sm hover:bg-cyan-700 transition-colors disabled:opacity-50 whitespace-nowrap shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          {adding ? "Adding..." : isPreorder ? "Pre-order" : "Add to Cart"}
        </button>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 lg:hidden" />
    </div>
  );
}
