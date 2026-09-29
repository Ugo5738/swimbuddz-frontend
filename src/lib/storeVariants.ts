/** Public option metadata may be absent on older products; SKUs remain authoritative. */
export type SelectableVariant = { id: string; is_active: boolean; options: Record<string, string> };

export function productOptionChoices(config: Record<string, unknown> | null | undefined, variants: SelectableVariant[]) {
  const choices: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(config ?? {})) {
    if (!key.startsWith("_") && Array.isArray(values)) {
      const valid = values.filter((value): value is string => typeof value === "string" && value.trim() !== "");
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

export function selectedProductVariant<T extends SelectableVariant>(variants: T[], choices: Record<string, string[]>, selection: Record<string, string>, explicitId = ""): T | null {
  const active = variants.filter((item) => item.is_active);
  const keys = Object.keys(choices);
  if (!keys.length) return active.length === 1 ? active[0] : active.find((item) => item.id === explicitId) ?? null;
  if (!keys.every((key) => selection[key])) return null;
  const matches = active.filter((variant) => keys.every((key) => variant.options?.[key] === selection[key]));
  return matches.length === 1 ? matches[0] : matches.find((item) => item.id === explicitId) ?? null;
}
