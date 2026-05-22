"use client";

import type { ProductFormData } from "../types";

type Props = {
  formData: ProductFormData;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => void;
};

export function PricingSection({ formData, onChange }: Props) {
  return (
    <div className="pt-4 border-t border-slate-200">
      <h3 className="text-lg font-medium text-slate-900 mb-4">Pricing</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Price (₦) *</label>
          <input
            type="number"
            name="base_price_ngn"
            value={formData.base_price_ngn}
            onChange={onChange}
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
            onChange={onChange}
            min="0"
            step="100"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price (₦)</label>
          <input
            type="number"
            name="cost_price_ngn"
            value={formData.cost_price_ngn}
            onChange={onChange}
            min="0"
            step="100"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          />
          <p className="text-xs text-slate-500 mt-1">COGS — internal only</p>
        </div>
      </div>
    </div>
  );
}
