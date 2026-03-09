"use client";

import { apiPost } from "@/lib/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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

const initialFormData: SupplierFormData = {
  name: "",
  slug: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  description: "",
  commission_percent: "",
  payout_bank_name: "",
  payout_account_number: "",
  payout_account_name: "",
  is_active: true,
};

export default function NewSupplierPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SupplierFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

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
      if (name === "name" && typeof value === "string") {
        updated.slug = generateSlug(value);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
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

      await apiPost("/api/v1/admin/store/suppliers", payload, { auth: true });
      toast.success("Supplier created successfully");
      router.push("/admin/store/suppliers");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create supplier");
    } finally {
      setSaving(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-slate-900 mt-2">New Supplier</h1>
        <p className="text-slate-500">Add a new supplier to sell products through your store</p>
      </div>

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
                placeholder="e.g. AquaGear Nigeria"
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
                placeholder="auto-generated"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                URL-friendly identifier. Auto-generated from name.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief description of the supplier's business"
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
                placeholder="Full name"
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
                placeholder="supplier@example.com"
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
                placeholder="+234..."
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
                placeholder="e.g. 15"
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
                placeholder="e.g. GTBank"
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
                placeholder="0123456789"
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
                placeholder="Account holder name"
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
            {saving ? "Creating..." : "Create Supplier"}
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
