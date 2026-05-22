"use client";

import type { Variant } from "../types";

export type VariantFormState = {
  name: string;
  sku: string;
  price_override_ngn: string;
  weight_grams: string;
  options: string;
};

type Props = {
  variants: Variant[];
  showVariantForm: boolean;
  setShowVariantForm: (value: boolean) => void;
  variantForm: VariantFormState;
  setVariantForm: React.Dispatch<React.SetStateAction<VariantFormState>>;
  onAddVariant: (e: React.FormEvent) => Promise<void>;
  onDeleteVariant: (variantId: string) => Promise<void>;
  savingVariant: boolean;
  deletingVariantId: string | null;
};

export function VariantsSidebar({
  variants,
  showVariantForm,
  setShowVariantForm,
  variantForm,
  setVariantForm,
  onAddVariant,
  onDeleteVariant,
  savingVariant,
  deletingVariantId,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Variants <span className="text-slate-400 font-normal">({variants.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowVariantForm(!showVariantForm)}
          className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
        >
          {showVariantForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add Variant Form */}
      {showVariantForm && (
        <form
          onSubmit={onAddVariant}
          className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg space-y-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Variant Name *
            </label>
            <input
              type="text"
              value={variantForm.name}
              onChange={(e) => setVariantForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. S, M, L or Red"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              SKU <span className="font-normal text-slate-400">(auto-generated if empty)</span>
            </label>
            <input
              type="text"
              value={variantForm.sku}
              onChange={(e) => setVariantForm((prev) => ({ ...prev, sku: e.target.value }))}
              placeholder="Leave blank to auto-generate"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Options{" "}
              <span className="font-normal text-slate-400">(one per line, Key: Value)</span>
            </label>
            <textarea
              value={variantForm.options}
              onChange={(e) =>
                setVariantForm((prev) => ({ ...prev, options: e.target.value }))
              }
              placeholder={"Size: L\nColor: Blue"}
              rows={2}
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Price Override (₦)
              </label>
              <input
                type="number"
                value={variantForm.price_override_ngn}
                onChange={(e) =>
                  setVariantForm((prev) => ({
                    ...prev,
                    price_override_ngn: e.target.value,
                  }))
                }
                min="0"
                step="100"
                placeholder="Base price"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Weight (g)</label>
              <input
                type="number"
                value={variantForm.weight_grams}
                onChange={(e) =>
                  setVariantForm((prev) => ({
                    ...prev,
                    weight_grams: e.target.value,
                  }))
                }
                min="0"
                placeholder="Optional"
                className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingVariant}
            className="w-full px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-md font-medium hover:bg-cyan-700 disabled:opacity-50"
          >
            {savingVariant ? "Creating..." : "Create Variant"}
          </button>
        </form>
      )}

      {/* Existing Variants List */}
      {variants.length === 0 ? (
        <p className="text-sm text-slate-500">
          No variants yet. Add one to enable inventory tracking.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <div key={variant.id} className="p-3 bg-slate-50 rounded-lg group">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-slate-900 truncate">
                    {variant.name || "Default"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono">{variant.sku}</p>
                  {variant.price_override_ngn && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      ₦{Number(variant.price_override_ngn).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                      (variant.quantity_available ?? variant.quantity_on_hand ?? 0) > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {variant.quantity_available ?? variant.quantity_on_hand ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteVariant(variant.id)}
                    disabled={deletingVariantId === variant.id}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-opacity disabled:opacity-50"
                    title="Deactivate variant"
                  >
                    {deletingVariantId === variant.id ? "..." : "×"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
