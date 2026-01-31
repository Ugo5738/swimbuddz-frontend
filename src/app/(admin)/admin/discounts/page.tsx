"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Discount {
    id: string;
    code: string;
    description: string | null;
    discount_type: "percentage" | "fixed";
    value: number;
    applies_to: string[] | null;
    valid_from: string | null;
    valid_until: string | null;
    max_uses: number | null;
    current_uses: number;
    max_uses_per_user: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface DiscountFormData {
    code: string;
    description: string;
    discount_type: "percentage" | "fixed";
    value: string;
    applies_to: string[];
    valid_from: string;
    valid_until: string;
    max_uses: string;
    is_active: boolean;
}

const PAYMENT_PURPOSES = ["COMMUNITY", "CLUB", "CLUB_BUNDLE", "ACADEMY_COHORT", "SESSION_FEE"];

export default function AdminDiscountsPage() {
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [formData, setFormData] = useState<DiscountFormData>({
        code: "",
        description: "",
        discount_type: "percentage",
        value: "",
        applies_to: [],
        valid_from: "",
        valid_until: "",
        max_uses: "",
        is_active: true,
    });
    const [submitting, setSubmitting] = useState(false);

    const loadDiscounts = useCallback(async () => {
        try {
            const data = await apiGet<Discount[]>("/api/v1/payments/admin/discounts", { auth: true });
            setDiscounts(data);
        } catch (error) {
            toast.error("Failed to load discounts");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDiscounts();
    }, [loadDiscounts]);

    const resetForm = () => {
        setFormData({
            code: "",
            description: "",
            discount_type: "percentage",
            value: "",
            applies_to: [],
            valid_from: "",
            valid_until: "",
            max_uses: "",
            is_active: true,
        });
        setEditingDiscount(null);
        setShowForm(false);
    };

    const handleEdit = (discount: Discount) => {
        setFormData({
            code: discount.code,
            description: discount.description || "",
            discount_type: discount.discount_type,
            value: String(discount.value),
            applies_to: discount.applies_to || [],
            valid_from: discount.valid_from ? discount.valid_from.split("T")[0] : "",
            valid_until: discount.valid_until ? discount.valid_until.split("T")[0] : "",
            max_uses: discount.max_uses ? String(discount.max_uses) : "",
            is_active: discount.is_active,
        });
        setEditingDiscount(discount);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                code: formData.code.toUpperCase().trim(),
                description: formData.description || null,
                discount_type: formData.discount_type,
                value: parseFloat(formData.value),
                applies_to: formData.applies_to.length > 0 ? formData.applies_to : null,
                valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
                valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                is_active: formData.is_active,
            };

            if (editingDiscount) {
                await apiPatch(`/api/v1/payments/admin/discounts/${editingDiscount.id}`, payload, { auth: true });
                toast.success("Discount updated successfully");
            } else {
                await apiPost("/api/v1/payments/admin/discounts", payload, { auth: true });
                toast.success("Discount created successfully");
            }

            resetForm();
            loadDiscounts();
        } catch (error) {
            toast.error(editingDiscount ? "Failed to update discount" : "Failed to create discount");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (discount: Discount) => {
        if (!confirm(`Are you sure you want to delete discount "${discount.code}"?`)) return;

        try {
            await apiDelete(`/api/v1/payments/admin/discounts/${discount.id}`, { auth: true });
            toast.success("Discount deleted");
            loadDiscounts();
        } catch (error) {
            toast.error("Failed to delete discount");
        }
    };

    const toggleAppliesTo = (purpose: string) => {
        setFormData(prev => ({
            ...prev,
            applies_to: prev.applies_to.includes(purpose)
                ? prev.applies_to.filter(p => p !== purpose)
                : [...prev.applies_to, purpose],
        }));
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString();
    };

    if (loading) {
        if (loading) {
            return (
                <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <LoadingSpinner size="lg" text="Loading discounts..." />
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Discount Codes</h1>
                    <p className="text-slate-600 text-sm">Manage discount codes for payments</p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Discount
                    </Button>
                )}
            </header>

            {/* Create/Edit Form */}
            {showForm && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">
                            {editingDiscount ? "Edit Discount" : "Create New Discount"}
                        </h2>
                        <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., SUMMER25"
                                    className="w-full px-3 py-2 border rounded-lg uppercase"
                                    disabled={!!editingDiscount}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Summer sale discount"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                                <select
                                    value={formData.discount_type}
                                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (₦)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Value * ({formData.discount_type === "percentage" ? "%" : "₦"})
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step={formData.discount_type === "percentage" ? "1" : "100"}
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    placeholder={formData.discount_type === "percentage" ? "10" : "5000"}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Max Uses</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.max_uses}
                                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                                    placeholder="Unlimited"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valid From</label>
                                <input
                                    type="date"
                                    value={formData.valid_from}
                                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valid Until</label>
                                <input
                                    type="date"
                                    value={formData.valid_until}
                                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Applies To (leave empty for all)</label>
                            <div className="flex flex-wrap gap-2">
                                {PAYMENT_PURPOSES.map((purpose) => (
                                    <button
                                        key={purpose}
                                        type="button"
                                        onClick={() => toggleAppliesTo(purpose)}
                                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${formData.applies_to.includes(purpose)
                                            ? "bg-cyan-100 border-cyan-300 text-cyan-800"
                                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            }`}
                                    >
                                        {purpose.replace("_", " ")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded"
                            />
                            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
                        </div>

                        <div className="flex gap-3">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? "Saving..." : editingDiscount ? "Update Discount" : "Create Discount"}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Discounts List */}
            {discounts.length === 0 && !showForm ? (
                <Card className="p-8 text-center">
                    <p className="text-slate-500">No discount codes yet.</p>
                    <Button onClick={() => setShowForm(true)} className="mt-4">
                        Create your first discount
                    </Button>
                </Card>
            ) : discounts.length > 0 ? (
                <div className="grid gap-4">
                    {discounts.map((discount) => (
                        <Card key={discount.id} className="p-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-lg font-bold text-slate-900 font-mono">
                                            {discount.code}
                                        </span>
                                        <Badge variant={discount.is_active ? "success" : "default"}>
                                            {discount.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                        <Badge variant="info">
                                            {discount.discount_type === "percentage"
                                                ? `${discount.value}% off`
                                                : `₦${discount.value.toLocaleString()} off`}
                                        </Badge>
                                    </div>
                                    {discount.description && (
                                        <p className="text-sm text-slate-600 mt-1">{discount.description}</p>
                                    )}
                                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                                        <span>Uses: {discount.current_uses}/{discount.max_uses || "∞"}</span>
                                        <span>Valid: {formatDate(discount.valid_from)} - {formatDate(discount.valid_until)}</span>
                                        {discount.applies_to && discount.applies_to.length > 0 && (
                                            <span>For: {discount.applies_to.join(", ")}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(discount)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(discount)} className="text-red-600 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
