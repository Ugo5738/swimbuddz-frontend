"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { useStoreCart } from "@/lib/storeCart";
import { ArrowLeft, Minus, Plus, ShoppingCart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
    variant_options: Record<string, string[]> | null;
    images: { id: string; url: string; alt_text: string | null; is_primary: boolean; sort_order: number }[];
    variants: ProductVariant[];
    category?: {
        id: string;
        name: string;
        slug: string;
    };
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { addItem, itemCount, isAuthenticated } = useStoreCart();

    const slug = params.slug as string;

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [adding, setAdding] = useState(false);
    const [sizeChartAcked, setSizeChartAcked] = useState(false);
    const [memberDiscount, setMemberDiscount] = useState(0);

    const loadProduct = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGet<ProductDetail>(`/api/v1/store/products/${slug}`);
            setProduct(data);

            // Set initial options from first variant
            if (data.variants.length > 0) {
                const firstVariant = data.variants.find((v) => v.is_active) || data.variants[0];
                setSelectedVariant(firstVariant);
                setSelectedOptions(firstVariant.options);
            }

            // Get member discount
            if (isAuthenticated) {
                try {
                    const member = await apiGet<{ membership?: { tier?: string } }>(
                        "/api/v1/members/me",
                        { auth: true }
                    );
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

    // Update selected variant when options change
    useEffect(() => {
        if (!product) return;

        const matchingVariant = product.variants.find((v) =>
            Object.entries(selectedOptions).every(([key, value]) => v.options[key] === value)
        );

        if (matchingVariant) {
            setSelectedVariant(matchingVariant);
        }
    }, [selectedOptions, product]);

    const handleOptionChange = (optionName: string, value: string) => {
        setSelectedOptions((prev) => ({ ...prev, [optionName]: value }));
    };

    const handleAddToCart = async () => {
        if (!selectedVariant) {
            toast.error("Please select options");
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
        } catch (e) {
            toast.error("Failed to add to cart");
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading product..." />;
    }

    if (!product) {
        return null;
    }

    const sortedImages = [...product.images].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return a.sort_order - b.sort_order;
    });

    const basePrice = selectedVariant?.price_override_ngn ?? product.base_price_ngn;
    const finalPrice = memberDiscount > 0 ? basePrice * (1 - memberDiscount / 100) : basePrice;
    const hasDiscount = product.compare_at_price_ngn && product.compare_at_price_ngn > basePrice;
    const isPreorder = product.sourcing_type === "preorder";
    const stock = selectedVariant?.inventory?.quantity_available ?? 999;
    const inStock = stock > 0 || isPreorder;

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link
                href="/store"
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                Back to Store
            </Link>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
                        {sortedImages.length > 0 ? (
                            <Image
                                src={sortedImages[selectedImage]?.url}
                                alt={sortedImages[selectedImage]?.alt_text || product.name}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <span className="text-6xl">🏊</span>
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                            {isPreorder && (
                                <span className="px-3 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-full">
                                    Pre-order · Ships in {product.preorder_lead_days || 14} days
                                </span>
                            )}
                            {hasDiscount && (
                                <span className="px-3 py-1.5 text-sm font-medium bg-rose-500 text-white rounded-full">
                                    Sale
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Thumbnails */}
                    {sortedImages.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {sortedImages.map((img, idx) => (
                                <button
                                    key={img.id}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === idx
                                        ? "border-cyan-500 ring-2 ring-cyan-200"
                                        : "border-slate-200 hover:border-slate-300"
                                        }`}
                                >
                                    <Image
                                        src={img.url}
                                        alt={img.alt_text || `${product.name} ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="space-y-6">
                    {/* Category */}
                    {product.category && (
                        <Link
                            href={`/store?category=${product.category.slug}`}
                            className="text-sm text-cyan-600 hover:underline"
                        >
                            {product.category.name}
                        </Link>
                    )}

                    <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>

                    {/* Price */}
                    <div className="flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-slate-900">
                            ₦{finalPrice.toLocaleString()}
                        </span>
                        {(hasDiscount || memberDiscount > 0) && (
                            <span className="text-xl text-slate-400 line-through">
                                ₦{basePrice.toLocaleString()}
                            </span>
                        )}
                        {memberDiscount > 0 && (
                            <span className="px-2 py-1 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                Member {memberDiscount}% off
                            </span>
                        )}
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center gap-2">
                        {inStock ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-sm text-emerald-600">
                                    {isPreorder ? "Available for pre-order" : stock <= 5 ? `Only ${stock} left` : "In stock"}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                <span className="text-sm text-slate-500">Out of stock</span>
                            </>
                        )}
                    </div>

                    {/* Description */}
                    {product.short_description && (
                        <p className="text-slate-600">{product.short_description}</p>
                    )}

                    {/* Variant Options */}
                    {product.variant_options && Object.keys(product.variant_options).length > 0 && (
                        <div className="space-y-4">
                            {Object.entries(product.variant_options).map(([optionName, values]) => (
                                <div key={optionName}>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        {optionName}: <span className="text-slate-500">{selectedOptions[optionName]}</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {values.map((value) => {
                                            const isSelected = selectedOptions[optionName] === value;
                                            // Check if this option is available
                                            const isAvailable = product.variants.some(
                                                (v) => v.options[optionName] === value && v.is_active
                                            );
                                            return (
                                                <button
                                                    key={value}
                                                    onClick={() => handleOptionChange(optionName, value)}
                                                    disabled={!isAvailable}
                                                    className={`px-4 py-2 rounded-lg border transition-all ${isSelected
                                                        ? "bg-cyan-500 text-white border-cyan-500"
                                                        : isAvailable
                                                            ? "bg-white text-slate-700 border-slate-200 hover:border-cyan-500"
                                                            : "bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed"
                                                        }`}
                                                >
                                                    {value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Size Chart Acknowledgment */}
                    {product.requires_size_chart_ack && (
                        <Card className="p-4 bg-amber-50 border-amber-200">
                            <div className="flex items-start gap-3">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sizeChartAcked}
                                        onChange={(e) => setSizeChartAcked(e.target.checked)}
                                        className="mt-1 w-5 h-5 rounded border-amber-300 text-cyan-500 focus:ring-cyan-500"
                                    />
                                    <span className="text-sm text-amber-800">
                                        I have reviewed the{" "}
                                        {product.size_chart_url ? (
                                            <a
                                                href={product.size_chart_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-cyan-600 underline"
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
                        </Card>
                    )}

                    {/* Quantity & Add to Cart */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center border border-slate-200 rounded-lg">
                            <button
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="p-3 hover:bg-slate-50 transition-colors"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-12 text-center font-medium">{quantity}</span>
                            <button
                                onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
                                className="p-3 hover:bg-slate-50 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <Button
                            onClick={handleAddToCart}
                            disabled={adding || !inStock}
                            size="lg"
                            className="flex-1"
                        >
                            {adding ? (
                                "Adding..."
                            ) : (
                                <>
                                    <ShoppingCart className="w-5 h-5 mr-2" />
                                    Add to Cart
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Cart Link */}
                    {itemCount > 0 && (
                        <Link
                            href="/store/cart"
                            className="block text-center text-sm text-cyan-600 hover:underline"
                        >
                            View Cart ({itemCount} items)
                        </Link>
                    )}

                    {/* Full Description */}
                    {product.description && (
                        <div className="pt-6 border-t border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900 mb-3">Description</h2>
                            <div className="prose prose-slate prose-sm max-w-none">
                                {product.description.split("\n").map((p, i) => (
                                    <p key={i}>{p}</p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
