"use client";

import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet, apiPatch } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  commission_percent: number | null;
  payout_bank_name: string | null;
  payout_account_number: string | null;
  payout_account_name: string | null;
  is_verified: boolean;
  status: string;
  is_active: boolean;
  total_products: number;
  total_orders: number;
  created_at: string;
  updated_at: string;
}

interface SupplierFormData {
  name: string;
  slug: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  commission_percent: string;
  payout_bank_name: string;
  payout_account_number: string;
  payout_account_name: string;
  is_active: boolean;
}

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSupplier = useCallback(async () => {
    try {
      const data = await apiGet<Supplier>(`/api/v1/admin/store/suppliers/${supplierId}`, {
        auth: true,
      });
      setSupplier(data);
      setFormData({
        name: data.name,
        slug: data.slug,
        contact_name: data.contact_name || "",
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
        description: data.description || "",
        commission_percent: data.commission_percent != null ? String(data.commission_percent) : "",
        payout_bank_name: data.payout_bank_name || "",
        payout_account_number: data.payout_account_number || "",
        payout_account_name: data.payout_account_name || "",
        is_active: data.is_active,
      });
    } catch {
      toast.error("Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadSupplier();
  }, [loadSupplier]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target;
    const name = target.name;
    const value = target.type === "checkbox" ? (target as HTMLInputElement).checked : target.value;

    setFormData((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        contact_name: formData.contact_name.trim() || null,
        contact_email: formData.contact_email.trim() || null,
        contact_phone: formData.contact_phone.trim() || null,
        description: formData.description.trim() || null,
        commission_percent: formData.commission_percent
          ? parseFloat(formData.commission_percent)
          : null,
        payout_bank_name: formData.payout_bank_name.trim() || null,
        payout_account_number: formData.payout_account_number.trim() || null,
        payout_account_name: formData.payout_account_name.trim() || null,
        is_active: formData.is_active,
      };

      await apiPatch(`/api/v1/admin/store/suppliers/${supplierId}`, payload, { auth: true });
      toast.success("Supplier updated");
      router.push("/admin/store/suppliers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update supplier");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return <LoadingCard text="Loading supplier..." />;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          href="/admin/store/suppliers"
          className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Suppliers
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Edit Supplier</h1>
        <p className="text-slate-500">{supplier?.name}</p>
      </div>

      {/* Stats Bar */}
      {supplier && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{supplier.total_products}</p>
            <p className="text-xs text-slate-500">Products</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{supplier.total_orders}</p>
            <p className="text-xs text-slate-500">Orders</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 text-center">
            <p className="text-sm font-medium text-slate-900">
              {supplier.is_verified ? "✓ Verified" : "Not Verified"}
            </p>
            <p className="text-xs text-slate-500">
              Status: <span className="capitalize">{supplier.status}</span>
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6"
      >
        {/* Business Info */}
        <div>
          <h3 className="text-lg font-medium text-slate-900 mb-4">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Business Name <span className="text-rose-500">*</span>
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
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
              <input
                type="text"
                name="contact_name"
                value={formData.contact_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Commission & Payout */}
        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Commission & Payout</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Commission Rate (%)
              </label>
              <input
                type="number"
                name="commission_percent"
                value={formData.commission_percent}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Platform commission taken from each sale
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                name="payout_bank_name"
                value={formData.payout_bank_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                name="payout_account_number"
                value={formData.payout_account_number}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Account Name</label>
              <input
                type="text"
                name="payout_account_name"
                value={formData.payout_account_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="pt-4 border-t border-slate-200">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm text-slate-700">Active (supplier can sell products)</span>
          </label>
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
  );
}
