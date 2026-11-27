"use client";

import type { Variant } from "../types";

export type VariantFormState = {
  name: string;
  sku: string;
  price_override_ngn: string;
  cost_price_ngn: string;
  weight_grams: string;
  options: string;
  is_active: boolean;
  allow_backorder?: boolean;
};

type Props = {
  variants: Variant[];
  showVariantForm: boolean;
  setShowVariantForm: (value: boolean) => void;
  variantForm: VariantFormState;
  setVariantForm: React.Dispatch<React.SetStateAction<VariantFormState>>;
  onAddVariant: (e: React.FormEvent) => Promise<void>;
  editingVariantId: string | null;
  editVariantForm: VariantFormState;
  setEditVariantForm: React.Dispatch<React.SetStateAction<VariantFormState>>;
  onStartEditVariant: (variant: Variant) => void;
  onCancelEditVariant: () => void;
  onUpdateVariant: (e: React.FormEvent) => Promise<void>;
  onDeleteVariant: (variantId: string) => Promise<void>;
  onToggleBackorder?: (variant: Variant) => Promise<void>;
  onBulkToggleBackorder?: (allow: boolean) => Promise<void>;
  togglingBackorderId?: string | null;
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
  editingVariantId,
  editVariantForm,
  setEditVariantForm,
  onStartEditVariant,
  onCancelEditVariant,
  onUpdateVariant,
  onDeleteVariant,
  onToggleBackorder,
  onBulkToggleBackorder,
  togglingBackorderId,
  savingVariant,
  deletingVariantId,
}: Props) {
  const activeVariants = variants.filter((v) => v.is_active);
  const allAllowBackorder =
    activeVariants.length > 0 && activeVariants.every((v) => Boolean(v.allow_backorder));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
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

      {onBulkToggleBackorder && activeVariants.length > 1 && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-2.5 py-2">
          <span className="text-[11px] text-amber-900">
            Continue selling when out of stock (all variants)
          </span>
          <button
            type="button"
            disabled={togglingBackorderId === "bulk"}
            onClick={() => onBulkToggleBackorder(!allAllowBackorder)}
            className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline whitespace-nowrap disabled:opacity-50"
          >
            {togglingBackorderId === "bulk"
              ? "Updating..."
              : allAllowBackorder
                ? "Disable all"
                : "Enable all"}
          </button>
        </div>
      )}

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

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Unit Cost (₦)
            </label>
            <input
              type="number"
              value={variantForm.cost_price_ngn}
              onChange={(e) =>
                setVariantForm((prev) => ({ ...prev, cost_price_ngn: e.target.value }))
              }
              min="0"
              step="0.01"
              placeholder="Inherit product cost"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(variantForm.allow_backorder)}
              onChange={(e) =>
                setVariantForm((prev) => ({ ...prev, allow_backorder: e.target.checked }))
              }
              className="mt-0.5"
            />
            <span>Continue selling when out of stock (pre-order)</span>
          </label>

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
          No purchasable options yet. Add an active variant before customers can order this product.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => (
            <div key={variant.id} className="p-3 bg-slate-50 rounded-lg group">
              {editingVariantId === variant.id ? (
                <form onSubmit={onUpdateVariant} className="space-y-3">
                  <div>
                    <label
                      htmlFor={`variant-name-${variant.id}`}
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      Variant Name
                    </label>
                    <input
                      id={`variant-name-${variant.id}`}
                      value={editVariantForm.name}
                      onChange={(event) =>
                        setEditVariantForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`variant-sku-${variant.id}`}
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      SKU
                    </label>
                    <input
                      id={`variant-sku-${variant.id}`}
                      required
                      value={editVariantForm.sku}
                      onChange={(event) =>
                        setEditVariantForm((current) => ({
                          ...current,
                          sku: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`variant-options-${variant.id}`}
                      className="block text-xs font-medium text-slate-600 mb-1"
                    >
                      Options <span className="font-normal text-slate-400">(Key: Value)</span>
                    </label>
                    <textarea
                      id={`variant-options-${variant.id}`}
                      rows={2}
                      value={editVariantForm.options}
                      onChange={(event) =>
                        setEditVariantForm((current) => ({
                          ...current,
                          options: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor={`variant-price-${variant.id}`}
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        Selling Price (₦)
                      </label>
                      <input
                        id={`variant-price-${variant.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={editVariantForm.price_override_ngn}
                        onChange={(event) =>
                          setEditVariantForm((current) => ({
                            ...current,
                            price_override_ngn: event.target.value,
                          }))
                        }
                        placeholder="Base price"
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`variant-cost-${variant.id}`}
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        Unit Cost (₦)
                      </label>
                      <input
                        id={`variant-cost-${variant.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={editVariantForm.cost_price_ngn}
                        onChange={(event) =>
                          setEditVariantForm((current) => ({
                            ...current,
                            cost_price_ngn: event.target.value,
                          }))
                        }
                        placeholder="Product cost"
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor={`variant-weight-${variant.id}`}
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        Weight (g)
                      </label>
                      <input
                        id={`variant-weight-${variant.id}`}
                        type="number"
                        min="0"
                        value={editVariantForm.weight_grams}
                        onChange={(event) =>
                          setEditVariantForm((current) => ({
                            ...current,
                            weight_grams: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                      />
                    </div>
                    <label className="flex items-end gap-2 pb-2 text-xs text-slate-700">
                      <input
                        id={`variant-active-${variant.id}`}
                        type="checkbox"
                        checked={editVariantForm.is_active}
                        onChange={(event) =>
                          setEditVariantForm((current) => ({
                            ...current,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      Active
                    </label>
                  </div>
                  <label
                    htmlFor={`variant-backorder-${variant.id}`}
                    className="flex items-start gap-2 text-xs text-slate-700"
                  >
                    <input
                      id={`variant-backorder-${variant.id}`}
                      type="checkbox"
                      checked={Boolean(editVariantForm.allow_backorder)}
                      onChange={(event) =>
                        setEditVariantForm((current) => ({
                          ...current,
                          allow_backorder: event.target.checked,
                        }))
                      }
                      className="mt-0.5"
                    />
                    <span>Continue selling when out of stock (pre-order)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={savingVariant}
                      className="flex-1 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {savingVariant ? "Saving..." : "Save variant"}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelEditVariant}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
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
                    {variant.cost_price_ngn != null ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        Cost ₦{Number(variant.cost_price_ngn).toLocaleString()}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {variant.allow_backorder && (
                        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                          Pre-order when OOS
                        </span>
                      )}
                      {onToggleBackorder && (
                        <button
                          type="button"
                          disabled={togglingBackorderId === variant.id}
                          onClick={() => onToggleBackorder(variant)}
                          className="text-[11px] text-slate-500 hover:text-amber-700 underline disabled:opacity-50"
                        >
                          {togglingBackorderId === variant.id
                            ? "Saving..."
                            : variant.allow_backorder
                              ? "Stop selling when OOS"
                              : "Allow pre-order when OOS"}
                        </button>
                      )}
                    </div>
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
                      onClick={() => onStartEditVariant(variant)}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-900"
                    >
                      Edit
                    </button>
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
