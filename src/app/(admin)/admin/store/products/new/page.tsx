"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiGet, apiPost, apiPatch } from "@/lib/api";

interface Category {
    id: string;
    name: string;
    slug: string;
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
}

const initialFormData: ProductFormData = {
    name: "",
    slug: "",
    category_id: "",
    description: "",
    short_description: "",
    base_price_ngn: "",
    compare_at_price_ngn: "",
    status: "draft",
    is_featured: false,
    sourcing_type: "stocked",
    preorder_lead_days: "",
    has_variants: false,
    requires_size_chart_ack: false,
    size_chart_url: "",
};

export default function NewProductPage() {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState<ProductFormData>(initialFormData);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await apiGet<Category[]>("/api/v1/store/admin/categories");
                setCategories(cats);
            } catch {
                toast.error("Failed to load categories");
            } finally {
                setLoading(false);
            }
        };
        loadCategories();
    }, []);

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const target = e.target;
        const name = target.name;
        const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

        setFormData((prev) => {
            const updated = { ...prev, [name]: value };
            // Auto-generate slug from name
            if (name === "name" && typeof value === "string") {
                updated.slug = generateSlug(value);
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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

            const result = await apiPost<{ id: string }>("/api/v1/store/admin/products", payload, { auth: true });
            toast.success("Product created successfully");
            router.push(`/admin/store/products/${result.id}/edit`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create product");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse bg-slate-200 h-8 w-48 rounded mb-6" />
                <div className="animate-pulse bg-slate-100 h-96 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1"
                >
                    ← Back to Products
                </button>
                <h1 className="text-2xl font-bold text-slate-900 mt-2">New Product</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
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
                            <p className="text-xs text-slate-500 mt-1">Original price for sale display</p>
                        </div>
                    </div>
                </div>

                {/* Settings */}
                <div className="pt-4 border-t border-slate-200">
                    <h3 className="text-lg font-medium text-slate-900 mb-4">Settings</h3>
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
                            <span className="text-sm text-slate-700">Featured product</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="has_variants"
                                checked={formData.has_variants}
                                onChange={handleChange}
                                className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="text-sm text-slate-700">Has size/color variants</span>
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
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-slate-200 flex gap-3">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? "Creating..." : "Create Product"}
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
    );
}
