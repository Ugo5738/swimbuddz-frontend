"use client";

import {
  optionValueAvailability,
  type SelectableVariant,
  type VariantAvailability,
} from "@/lib/storeVariants";
import Image from "next/image";

interface ProductVariantSelectorProps {
  optionChoices: Record<string, string[]>;
  variants: SelectableVariant[];
  selectedOptions: Record<string, string>;
  sourcingType: string;
  variantOptionsMeta: (Record<string, unknown> & { _color_swatches?: Record<string, string> }) | null;
  onSelectOption: (optionName: string, value: string) => void;
}

const STATE_TITLE_SUFFIX: Record<VariantAvailability, string> = {
  in_stock: "In stock",
  preorder: "Available for pre-order",
  out_of_stock: "Out of stock",
  unavailable: "Unavailable",
};

export function ProductVariantSelector({
  optionChoices,
  variants,
  selectedOptions,
  sourcingType,
  variantOptionsMeta,
  onSelectOption,
}: ProductVariantSelectorProps) {
  const entries = Object.entries(optionChoices);
  if (!entries.length) return null;

  // Determine whether this product has mixed availability across options so we
  // only show the compact availability legend when it actually clarifies choices.
  const observedStates = new Set<VariantAvailability>();
  for (const [optionName, values] of entries) {
    for (const value of values) {
      observedStates.add(
        optionValueAvailability(variants, optionName, value, selectedOptions, sourcingType)
      );
    }
  }
  const showLegend =
    observedStates.size > 1 &&
    (observedStates.has("out_of_stock") || observedStates.has("preorder"));

  return (
    <div className="space-y-4 mb-5">
      {entries.map(([optionName, values]) => {
        const isColorOption = optionName.toLowerCase() === "color";
        const swatches =
          isColorOption && variantOptionsMeta
            ? (variantOptionsMeta._color_swatches as Record<string, string> | undefined)
            : undefined;

        return (
          <div key={optionName}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {optionName}
              {selectedOptions[optionName] && (
                <span className="text-slate-400 font-normal ml-1">
                  — {selectedOptions[optionName]}
                </span>
              )}
            </label>

            {isColorOption ? (
              /* ── Color swatch selector with In-Stock / Pre-order / Out-of-Stock visuals ── */
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const isSelected = selectedOptions[optionName] === value;
                  const state = optionValueAvailability(
                    variants,
                    optionName,
                    value,
                    selectedOptions,
                    sourcingType
                  );
                  const isDisabled = state === "unavailable";
                  const isOutOfStock = state === "out_of_stock";
                  const isPreorderOpt = state === "preorder";
                  const swatchUrl = swatches?.[value];

                  const borderClass = isSelected
                    ? isOutOfStock
                      ? "border-slate-500 ring-2 ring-slate-200 shadow-sm"
                      : isPreorderOpt
                        ? "border-amber-500 ring-2 ring-amber-200 shadow-sm"
                        : "border-cyan-500 ring-2 ring-cyan-200 shadow-sm"
                    : isDisabled
                      ? "border-slate-100 opacity-35 cursor-not-allowed"
                      : isOutOfStock
                        ? "border-slate-300 border-dashed opacity-55 hover:opacity-80"
                        : isPreorderOpt
                          ? "border-amber-300 bg-amber-50/60 hover:border-amber-500"
                          : "border-slate-200 hover:border-cyan-400";

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onSelectOption(optionName, value)}
                      disabled={isDisabled}
                      title={`${value} — ${STATE_TITLE_SUFFIX[state]}`}
                      data-availability={state}
                      aria-pressed={isSelected}
                      className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${borderClass} ${
                        swatchUrl ? "w-16 h-16" : "px-4 py-2"
                      }`}
                    >
                      {swatchUrl ? (
                        <>
                          <Image
                            src={swatchUrl}
                            alt={value}
                            fill
                            unoptimized
                            className={`object-cover ${isOutOfStock ? "grayscale-[40%]" : ""}`}
                          />
                          {isOutOfStock && (
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 64 64"
                              className="pointer-events-none absolute inset-0 h-full w-full"
                            >
                              <line
                                x1="4"
                                y1="60"
                                x2="60"
                                y2="4"
                                stroke="rgba(15, 23, 42, 0.55)"
                                strokeWidth="3"
                                strokeLinecap="round"
                              />
                              <line
                                x1="4"
                                y1="60"
                                x2="60"
                                y2="4"
                                stroke="rgba(255, 255, 255, 0.8)"
                                strokeWidth="1.25"
                                strokeLinecap="round"
                              />
                            </svg>
                          )}
                          {isPreorderOpt && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute top-0 left-0 rounded-br-md bg-amber-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white leading-none shadow-sm"
                            >
                              Pre
                            </span>
                          )}
                        </>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                            isOutOfStock
                              ? "text-slate-400 line-through"
                              : isSelected
                                ? isPreorderOpt
                                  ? "text-amber-800"
                                  : "text-cyan-700"
                                : isPreorderOpt
                                  ? "text-amber-900"
                                  : "text-slate-700"
                          }`}
                        >
                          {isPreorderOpt && (
                            <span
                              aria-hidden="true"
                              className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
                            />
                          )}
                          {value}
                        </span>
                      )}
                      {isSelected && swatchUrl && !isOutOfStock && (
                        <div
                          aria-hidden="true"
                          className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
                            isPreorderOpt ? "bg-amber-500" : "bg-cyan-500"
                          }`}
                        >
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              /* ── Text chip selector (Size, etc.) with Nike/Shopify availability cues ── */
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const isSelected = selectedOptions[optionName] === value;
                  const state = optionValueAvailability(
                    variants,
                    optionName,
                    value,
                    selectedOptions,
                    sourcingType
                  );
                  const isDisabled = state === "unavailable";
                  const isOutOfStock = state === "out_of_stock";
                  const isPreorderOpt = state === "preorder";

                  const chipClass = isSelected
                    ? isOutOfStock
                      ? "bg-slate-100 text-slate-600 border-slate-400 line-through shadow-sm"
                      : isPreorderOpt
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                    : isDisabled
                      ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                      : isOutOfStock
                        ? "bg-slate-50 text-slate-400 border-slate-200 border-dashed line-through hover:border-slate-400 hover:text-slate-600"
                        : isPreorderOpt
                          ? "bg-amber-50/70 text-amber-900 border-amber-300 hover:border-amber-500"
                          : "bg-white text-slate-700 border-slate-200 hover:border-cyan-400 hover:text-cyan-700";

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onSelectOption(optionName, value)}
                      disabled={isDisabled}
                      title={`${value} — ${STATE_TITLE_SUFFIX[state]}`}
                      data-availability={state}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border-2 font-medium transition-all ${chipClass}`}
                    >
                      {isPreorderOpt && !isSelected && (
                        <span
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
                        />
                      )}
                      {value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showLegend && (
        <div
          aria-label="Option availability key"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-500"
        >
          {observedStates.has("in_stock") && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              In stock
            </span>
          )}
          {observedStates.has("preorder") && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Pre-order (ordered on demand)
            </span>
          )}
          {observedStates.has("out_of_stock") && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block px-1 border border-dashed border-slate-300 rounded text-[10px] text-slate-400 line-through leading-tight">
                Out
              </span>
              Out of stock
            </span>
          )}
        </div>
      )}
    </div>
  );
}
