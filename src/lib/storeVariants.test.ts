import { describe, expect, it } from "vitest";
import {
  canPurchaseVariant,
  optionValueAvailability,
  variantAvailability,
  type SelectableVariant,
} from "./storeVariants";

const makeVariant = (
  id: string,
  options: Record<string, string>,
  overrides: Partial<SelectableVariant> = {}
): SelectableVariant => ({
  id,
  is_active: true,
  options,
  quantity_available: 0,
  allow_backorder: false,
  ...overrides,
});

describe("storeVariants availability states", () => {
  it("classifies stocked variants into in_stock, preorder (allow_backorder), out_of_stock, and unavailable", () => {
    const inStock = makeVariant("blue", { Color: "Blue" }, { quantity_available: 5 });
    const backorder = makeVariant("black", { Color: "Black" }, { quantity_available: 0, allow_backorder: true });
    const oos = makeVariant("gray", { Color: "Gray" }, { quantity_available: 0, allow_backorder: false });
    const inactive = makeVariant("red", { Color: "Red" }, { is_active: false, quantity_available: 3 });

    expect(variantAvailability(inStock, "stocked")).toBe("in_stock");
    expect(variantAvailability(backorder, "stocked")).toBe("preorder");
    expect(variantAvailability(oos, "stocked")).toBe("out_of_stock");
    expect(variantAvailability(inactive, "stocked")).toBe("unavailable");

    expect(canPurchaseVariant(inStock, "stocked")).toBe(true);
    expect(canPurchaseVariant(backorder, "stocked")).toBe(true);
    expect(canPurchaseVariant(oos, "stocked")).toBe(false);
    expect(canPurchaseVariant(inactive, "stocked")).toBe(false);
  });

  it("treats product-level preorder as preorder and dropship as in_stock even at 0 stock", () => {
    const v = makeVariant("v1", { Color: "Blue" }, { quantity_available: 0 });
    expect(variantAvailability(v, "preorder")).toBe("preorder");
    expect(variantAvailability(v, "dropship")).toBe("in_stock");
  });

  it("cross-filters multi-dimension availability while keeping switchable values clickable", () => {
    const variants = [
      makeVariant("blu-s", { Color: "Blue", Size: "S" }, { quantity_available: 4 }),
      makeVariant("blu-l", { Color: "Blue", Size: "L" }, { quantity_available: 0, allow_backorder: true }),
      makeVariant("gry-s", { Color: "Gray", Size: "S" }, { quantity_available: 0, allow_backorder: false }),
    ];

    // With Color=Blue selected: Size S is in_stock, Size L is preorder
    expect(optionValueAvailability(variants, "Size", "S", { Color: "Blue" }, "stocked")).toBe("in_stock");
    expect(optionValueAvailability(variants, "Size", "L", { Color: "Blue" }, "stocked")).toBe("preorder");

    // With Size=S selected: Color Blue is in_stock, Color Gray is out_of_stock
    expect(optionValueAvailability(variants, "Color", "Blue", { Size: "S" }, "stocked")).toBe("in_stock");
    expect(optionValueAvailability(variants, "Color", "Gray", { Size: "S" }, "stocked")).toBe("out_of_stock");

    // Nonexistent option value is unavailable
    expect(optionValueAvailability(variants, "Color", "Neon", {}, "stocked")).toBe("unavailable");
  });
});
