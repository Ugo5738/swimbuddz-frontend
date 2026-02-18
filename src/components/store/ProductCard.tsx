"use client";

import { useStoreCart } from "@/lib/storeCart";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

interface Product {
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
  default_variant?: {
    id: string;
    sku: string;
  };
}

interface ProductCardProps {
  product: Product;
  memberDiscountPercent?: number;
}

export function ProductCard({
  product,
  memberDiscountPercent = 0,
}: ProductCardProps) {
  const { addItem } = useStoreCart();
  const [adding, setAdding] = useState(false);

  const images = product.images || [];
  const primaryImage = images.find((img) => img.is_primary) || images[0];
  // Validate image URL - must start with http/https and be a valid URL
  const hasValidImage =
    primaryImage?.url && primaryImage.url.startsWith("http");
  const hasDiscount =
    product.compare_at_price_ngn &&
    product.compare_at_price_ngn > product.base_price_ngn;
  const isPreorder = product.sourcing_type === "preorder";

  const finalPrice =
    memberDiscountPercent > 0
      ? product.base_price_ngn * (1 - memberDiscountPercent / 100)
      : product.base_price_ngn;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.default_variant) {
      toast.info("Please select options on product page");
      return;
    }

    setAdding(true);
    try {
      await addItem(product.default_variant.id, 1);
      toast.success(`${product.name} added to cart`);
    } catch (err) {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link
      href={`/store/product/${product.slug}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-100"
    >
      {/* Image */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {hasValidImage ? (
          <Image
            src={primaryImage.url}
            alt={product.name}
            fill
            unoptimized // Bypass Next.js image optimization for external URLs
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <svg
              className="w-16 h-16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_featured && (
            <span className="px-2 py-1 text-xs font-medium bg-cyan-500 text-white rounded-full">
              Featured
            </span>
          )}
          {isPreorder && (
            <span className="px-2 py-1 text-xs font-medium bg-amber-500 text-white rounded-full">
              Pre-order
            </span>
          )}
          {hasDiscount && (
            <span className="px-2 py-1 text-xs font-medium bg-rose-500 text-white rounded-full">
              Sale
            </span>
          )}
        </div>

        {/* Quick Add Button */}
        {product.default_variant && (
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            className="absolute bottom-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500 hover:text-white disabled:opacity-50"
          >
            {adding ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
            {product.short_description}
          </p>
        )}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-slate-900">
            ₦{finalPrice.toLocaleString()}
          </span>
          {(hasDiscount || memberDiscountPercent > 0) && (
            <span className="text-sm text-slate-400 line-through">
              ₦{product.base_price_ngn.toLocaleString()}
            </span>
          )}
          {memberDiscountPercent > 0 && (
            <span className="text-xs font-medium text-emerald-600">
              {memberDiscountPercent}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
