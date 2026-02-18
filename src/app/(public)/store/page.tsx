"use client";

import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/Button";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { useStoreCart } from "@/lib/storeCart";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

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

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
}

export default function StorePage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading store..." />}>
      <StorePageContent />
    </Suspense>
  );
}

function StorePageContent() {
  const { isAuthenticated } = useStoreCart();
  const searchParams = useSearchParams();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [memberDiscount, setMemberDiscount] = useState(0);

  const featured = searchParams.get("featured") === "true";
  const search = searchParams.get("q") || "";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Build products URL with query params
      const productParams = new URLSearchParams();
      if (selectedCategory) productParams.set("category", selectedCategory);
      if (featured) productParams.set("featured", "true");
      if (search) productParams.set("search", search);
      productParams.set("page_size", "24");
      const productsUrl = `/api/v1/store/products?${productParams.toString()}`;

      // Load categories and products in parallel
      const [categoriesData, productsData] = await Promise.all([
        apiGet<Category[]>("/api/v1/store/categories"),
        apiGet<ProductListResponse>(productsUrl),
      ]);

      setCategories(categoriesData);
      setProducts(productsData.items);

      // Get member discount if logged in
      if (isAuthenticated) {
        try {
          const member = await apiGet<{ membership?: { tier?: string } }>(
            "/api/v1/members/me",
            { auth: true },
          );
          const tier = member?.membership?.tier;
          if (tier === "academy") setMemberDiscount(15);
          else if (tier === "club") setMemberDiscount(10);
          else if (tier === "community") setMemberDiscount(5);
        } catch {
          // Ignore auth errors
        }
      }
    } catch (e) {
      console.error("Failed to load store data:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, featured, search, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingCard text="Loading store..." />;
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8 bg-gradient-to-br from-cyan-500 to-blue-600 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 -mt-8 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          SwimBuddz Store
        </h1>
        <p className="text-cyan-100 max-w-xl mx-auto">
          Quality swim gear for swimmers of all levels.
          {memberDiscount > 0 && (
            <span className="block mt-1 text-white font-medium">
              You get {memberDiscount}% off as a member! 🎉
            </span>
          )}
        </p>
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "primary" : "secondary"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.slug ? "primary" : "secondary"}
              size="sm"
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              memberDiscountPercent={memberDiscount}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-1">
            No products found
          </h3>
          <p className="text-slate-500">
            {selectedCategory
              ? "Try selecting a different category"
              : "Check back soon for new arrivals"}
          </p>
        </div>
      )}
    </div>
  );
}
