/** Public option metadata may be absent on older products; SKUs remain authoritative. */
export type SelectableVariant = {
  id: string;
  is_active: boolean;
  options: Record<string, string>;
  quantity_available?: number;
  allow_backorder?: boolean;
};

export type VariantAvailability = "in_stock" | "preorder" | "out_of_stock" | "unavailable";

export function productOptionChoices(
  config: Record<string, unknown> | null | undefined,
  variants: SelectableVariant[]
) {
  const choices: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(config ?? {})) {
    if (!key.startsWith("_") && Array.isArray(values)) {
      const valid = values.filter(
        (value): value is string => typeof value === "string" && value.trim() !== ""
      );
      if (valid.length) choices[key] = [...new Set(valid)];
    }
  }
  for (const variant of variants.filter((item) => item.is_active)) {
    for (const [key, value] of Object.entries(variant.options ?? {})) {
      if (!key.startsWith("_") && typeof value === "string" && value.trim()) {
        choices[key] = [...new Set([...(choices[key] ?? []), value])];
      }
    }
  }
  return choices;
}

export function selectedProductVariant<T extends SelectableVariant>(
  variants: T[],
  choices: Record<string, string[]>,
  selection: Record<string, string>,
  explicitId = ""
): T | null {
  const active = variants.filter((item) => item.is_active);
  const keys = Object.keys(choices);
  if (!keys.length)
    return active.length === 1
      ? active[0]
      : active.find((item) => item.id === explicitId) ?? null;
  if (!keys.every((key) => selection[key])) return null;
  const matches = active.filter((variant) =>
    keys.every((key) => variant.options?.[key] === selection[key])
  );
  return matches.length === 1
    ? matches[0]
    : matches.find((item) => item.id === explicitId) ?? null;
}

/** Availability state for a single variant given its product's sourcing_type. */
export function variantAvailability(
  variant: SelectableVariant,
  productSourcingType?: string | null
): VariantAvailability {
  if (!variant.is_active) return "unavailable";
  if (productSourcingType === "dropship") return "in_stock";
  if ((variant.quantity_available ?? 0) > 0) return "in_stock";
  if (productSourcingType === "preorder" || Boolean(variant.allow_backorder)) {
    return "preorder";
  }
  return "out_of_stock";
}

export function canPurchaseVariant(
  variant: SelectableVariant | null | undefined,
  productSourcingType?: string | null
): boolean {
  if (!variant) return false;
  const state = variantAvailability(variant, productSourcingType);
  return state === "in_stock" || state === "preorder";
}

function bestAvailability(states: VariantAvailability[]): VariantAvailability {
  if (states.includes("in_stock")) return "in_stock";
  if (states.includes("preorder")) return "preorder";
  if (states.includes("out_of_stock")) return "out_of_stock";
  return "unavailable";
}

/**
 * Determine the visual availability state of an option chip/swatch (e.g. Color="Black").
 * Cross-filters against other currently-selected options when matching SKUs exist, and
 * falls back to all active variants with that value so multi-dimension switches remain
 * clickable unless no active SKU exists for that value at all.
 */
export function optionValueAvailability(
  variants: SelectableVariant[],
  optionName: string,
  value: string,
  selectedOptions: Record<string, string>,
  productSourcingType?: string | null
): VariantAvailability {
  const activeWithValue = variants.filter(
    (v) => v.is_active && v.options?.[optionName] === value
  );
  if (!activeWithValue.length) return "unavailable";

  const otherSelections = Object.entries(selectedOptions).filter(
    ([key, selectedVal]) => key !== optionName && Boolean(selectedVal)
  );
  const crossMatched = otherSelections.length
    ? activeWithValue.filter((v) =>
        otherSelections.every(([key, selectedVal]) => v.options?.[key] === selectedVal)
      )
    : activeWithValue;

  const pool = crossMatched.length ? crossMatched : activeWithValue;
  return bestAvailability(pool.map((v) => variantAvailability(v, productSourcingType)));
}
