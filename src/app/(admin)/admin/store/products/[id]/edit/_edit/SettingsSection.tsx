"use client";

import { MediaInput } from "@/components/ui/MediaInput";

import type { ProductFormData } from "../types";

type Props = {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData | null>>;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

export function SettingsSection({ formData, setFormData, onChange }: Props) {
  return (
    <div className="pt-4 border-t border-slate-200">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={onChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Sourcing Type</label>
          <select
            name="sourcing_type"
            value={formData.sourcing_type}
            onChange={onChange}
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
            onChange={onChange}
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
            onChange={onChange}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm text-slate-700">Featured product</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="has_variants"
            checked={formData.has_variants}
            onChange={onChange}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm text-slate-700">Has variants</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="requires_size_chart_ack"
            checked={formData.requires_size_chart_ack}
            onChange={onChange}
            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <span className="text-sm text-slate-700">Require size chart acknowledgment</span>
        </label>
      </div>

      {formData.requires_size_chart_ack && (
        <div className="mt-4">
          <MediaInput
            label="Size Chart"
            purpose="size_chart"
            mode="both"
            value={formData.size_chart_media_id || null}
            onChange={(mediaId, fileUrl) =>
              setFormData((prev) =>
                prev
                  ? {
                      ...prev,
                      size_chart_media_id: mediaId || "",
                      size_chart_url: fileUrl || "",
                    }
                  : null,
              )
            }
          />
        </div>
      )}
    </div>
  );
}
