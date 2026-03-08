"use client";

import { ProductCard } from "@/components/store/ProductCard";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { useStoreCart } from "@/lib/storeCart";
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

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
  created_at?: string;
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

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

/* ------------------------------------------------------------------ */
/* Category gradient fallbacks                                         */
/* ------------------------------------------------------------------ */

const CATEGORY_GRADIENTS = [
  "from-cyan-400 to-cyan-600",
  "from-blue-400 to-blue-600",
  "from-teal-400 to-teal-600",
  "from-indigo-400 to-indigo-600",
  "from-violet-400 to-violet-600",
  "from-emerald-400 to-emerald-600",
  "from-sky-400 to-sky-600",
  "from-rose-400 to-rose-600",
];

/* ------------------------------------------------------------------ */
/* Sort options                                                        */
/* ------------------------------------------------------------------ */

type SortKey = "featured" | "price_asc" | "price_desc" | "newest";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

/* ------------------------------------------------------------------ */
/* Page wrapper (Suspense for useSearchParams)                         */
/* ------------------------------------------------------------------ */

export default function StorePage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading store..." />}>
      <StorePageContent />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Main page content                                                   */
/* ------------------------------------------------------------------ */

function StorePageContent() {
  const { isAuthenticated } = useStoreCart();
  const searchParams = useSearchParams();

  /* ---- state ---- */
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [sortBy, setSortBy] = useState<SortKey>("featured");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const featured = searchParams.get("featured") === "true";
  const search = searchParams.get("search") || "";
  const PAGE_SIZE = 24;

  /* ---- data loading ---- */
  const loadData = useCallback(
    async (pageNum = 1, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const productParams = new URLSearchParams();
        if (selectedCategory) productParams.set("category", selectedCategory);
        if (featured) productParams.set("featured", "true");
        if (search) productParams.set("search", search);
        productParams.set("page", String(pageNum));
        productParams.set("page_size", String(PAGE_SIZE));
        const productsUrl = `/api/v1/store/products?${productParams.toString()}`;

        if (append) {
          const productsData = await apiGet<ProductListResponse>(productsUrl);
          setProducts((prev) => [...prev, ...productsData.items]);
          setTotal(productsData.total);
          setPage(pageNum);
        } else {
          // First load — fetch categories, products, collections in parallel
          const [categoriesData, productsData] = await Promise.all([
            apiGet<Category[]>("/api/v1/store/categories"),
            apiGet<ProductListResponse>(productsUrl),
          ]);

          // Try loading collections (won't fail if endpoint doesn't exist yet)
          let collectionsData: Collection[] = [];
          try {
            collectionsData = await apiGet<Collection[]>("/api/v1/store/collections");
          } catch {
            // Collections endpoint may not exist yet — gracefully degrade
          }

          setCategories(categoriesData);
          setProducts(productsData.items);
          setCollections(collectionsData);
          setTotal(productsData.total);
          setPage(pageNum);

          // Get member discount if logged in
          if (isAuthenticated) {
            try {
              const member = await apiGet<{
                membership?: { tier?: string };
              }>("/api/v1/members/me", { auth: true });
              const tier = member?.membership?.tier;
              if (tier === "academy") setMemberDiscount(15);
              else if (tier === "club") setMemberDiscount(10);
              else if (tier === "community") setMemberDiscount(5);
            } catch {
              // Ignore auth errors
            }
          }
        }
      } catch (e) {
        console.error("Failed to load store data:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedCategory, featured, search, isAuthenticated]
  );

  useEffect(() => {
    setPage(1);
    loadData(1);
  }, [loadData]);

  /* ---- sorting (client-side on loaded page) ---- */
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case "price_asc":
        sorted.sort((a, b) => a.base_price_ngn - b.base_price_ngn);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.base_price_ngn - a.base_price_ngn);
        break;
      case "newest":
        sorted.sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        break;
      case "featured":
      default:
        // Featured items first, then rest
        sorted.sort((a, b) => {
          if (a.is_featured === b.is_featured) return 0;
          return a.is_featured ? -1 : 1;
        });
        break;
    }
    return sorted;
  }, [products, sortBy]);

  const hasMore = products.length < total;

  /* ---- loading state ---- */
  if (loading) {
    return <LoadingCard text="Loading store..." />;
  }

  const isFilterActive = !!selectedCategory || !!search || featured;
  const storeIsEmpty = products.length === 0 && !isFilterActive;

  return (
    <div>
      {/* ============================================================ */}
      {/* HERO                                                         */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-cyan-50 via-white to-blue-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex items-center justify-between gap-8">
            {/* Left: copy */}
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-widest text-cyan-600 uppercase mb-2">
                SwimBuddz Gear
              </p>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight">
                Swim gear that moves <span className="text-cyan-600">with you</span>
              </h1>
              <p className="mt-3 text-slate-600 text-base md:text-lg leading-relaxed">
                Quality swim essentials curated for the SwimBuddz community. From training to
                competition, find everything you need.
              </p>

              {/* Member discount pill */}
              {memberDiscount > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  You get {memberDiscount}% member discount
                </div>
              )}

              {/* CTAs */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors shadow-sm"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4" />
                </a>
                {collections.length > 0 && (
                  <a
                    href="#collections"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:border-cyan-300 hover:text-cyan-700 transition-colors"
                  >
                    Browse Collections
                  </a>
                )}
              </div>
            </div>

            {/* Right: decorative shapes (desktop) */}
            <div className="hidden lg:block relative w-72 h-72 flex-shrink-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-200/40 rounded-full blur-2xl" />
              <div className="absolute bottom-4 left-4 w-36 h-36 bg-blue-200/40 rounded-full blur-2xl" />
              <div className="absolute top-12 right-12 w-56 h-56 border-2 border-cyan-200/60 rounded-full" />
              <div className="absolute top-20 right-20 w-40 h-40 border-2 border-blue-200/40 rounded-full" />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="border-t border-slate-100 bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center gap-6 md:gap-10 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                Free Pool Pickup
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                Secure Paystack Checkout
              </span>
              {memberDiscount > 0 ? (
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  Up to {memberDiscount}% Member Discount
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-500" />
                  Up to 15% Member Discount
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* CATEGORY NAVIGATION                                          */}
      {/* ============================================================ */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Shop by Category</h2>

          {/* Desktop grid / Mobile horizontal scroll */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 md:overflow-visible md:pb-0">
            {/* "All" card */}
            <button
              onClick={() => setSelectedCategory(null)}
              className={`flex-shrink-0 snap-start relative rounded-xl overflow-hidden h-28 md:h-36 w-28 md:w-auto transition-all ${
                selectedCategory === null
                  ? "ring-2 ring-cyan-500 ring-offset-2"
                  : "hover:ring-2 hover:ring-slate-200 hover:ring-offset-1"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-800" />
              <div className="relative h-full flex flex-col items-center justify-center text-white p-3">
                <Sparkles className="w-6 h-6 mb-1.5 opacity-80" />
                <span className="text-sm font-semibold">All</span>
              </div>
            </button>

            {/* Category cards */}
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.slug ? null : cat.slug)}
                className={`flex-shrink-0 snap-start relative rounded-xl overflow-hidden h-28 md:h-36 w-28 md:w-auto transition-all ${
                  selectedCategory === cat.slug
                    ? "ring-2 ring-cyan-500 ring-offset-2"
                    : "hover:ring-2 hover:ring-slate-200 hover:ring-offset-1"
                }`}
              >
                {cat.image_url ? (
                  <>
                    <Image
                      src={cat.image_url}
                      alt={cat.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                ) : (
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENTS[idx % CATEGORY_GRADIENTS.length]}`}
                  />
                )}
                <div className="relative h-full flex items-end p-3">
                  <span className="text-sm font-semibold text-white drop-shadow-sm">
                    {cat.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* FEATURED COLLECTIONS                                         */}
      {/* ============================================================ */}
      {collections.length > 0 && (
        <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {collections.slice(0, 2).map((col) => (
              <Link
                key={col.id}
                href={`/store?collection=${col.slug}`}
                className="group relative rounded-2xl overflow-hidden h-44 md:h-56 bg-slate-800"
              >
                {col.image_url && (
                  <>
                    <Image
                      src={col.image_url}
                      alt={col.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-lg font-bold text-white">{col.name}</h3>
                  {col.description && (
                    <p className="text-sm text-white/80 mt-1 line-clamp-2">{col.description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors">
                    Shop Collection
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* PRODUCT GRID                                                 */}
      {/* ============================================================ */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Toolbar */}
        {products.length > 0 && (
          <div className="flex items-center justify-between mb-5 gap-4">
            <p className="text-sm text-slate-500">
              <span className="font-medium text-slate-700">{products.length}</span>
              {total > products.length && (
                <span>
                  {" "}
                  of <span className="font-medium text-slate-700">{total}</span>
                </span>
              )}{" "}
              product{total !== 1 ? "s" : ""}
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="ml-2 text-cyan-600 hover:text-cyan-700 font-medium"
                >
                  Clear filter
                </button>
              )}
            </p>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none pl-3 pr-8 py-1.5 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Grid */}
        {sortedProducts.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  memberDiscountPercent={memberDiscount}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => loadData(page + 1, true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-cyan-700 bg-cyan-50 rounded-lg hover:bg-cyan-100 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>Load More Products</>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          /* ======================================================== */
          /* EMPTY STATE                                               */
          /* ======================================================== */
          <div className="text-center py-16">
            {storeIsEmpty ? (
              /* Store is actually empty */
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyan-50 mb-5">
                  <PackageSearch className="w-10 h-10 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  We&apos;re stocking the shelves!
                </h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  The SwimBuddz Store is getting ready with quality swim gear, accessories, and
                  essentials. Check back soon!
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Explore SwimBuddz
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : (
              /* Filter/search returned no results */
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-5">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  {search
                    ? `No results for "${search}". Try a different search term.`
                    : selectedCategory
                      ? "No products in this category yet."
                      : "Try adjusting your filters."}
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    // Clear search by navigating to /store
                    if (search || featured) {
                      window.location.href = "/store";
                    }
                  }}
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:border-cyan-300 hover:text-cyan-700 transition-colors"
                >
                  View All Products
                </button>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
