import { describe, expect, it } from "vitest";

import { formatOperatingAreaPath, type OperatingArea } from "../poolPricing";

const base = {
  country_code: "NG",
  timezone: "Africa/Lagos",
  currency: "NGN",
  is_active: true,
};

describe("formatOperatingAreaPath", () => {
  it("walks from the selected area to the top-level geography", () => {
    const areas: OperatingArea[] = [
      {
        ...base,
        id: "ng",
        name: "Nigeria",
        slug: "nigeria",
        area_type: "country",
        parent_id: null,
      },
      {
        ...base,
        id: "lagos",
        name: "Lagos",
        slug: "lagos",
        area_type: "market",
        parent_id: "ng",
      },
      {
        ...base,
        id: "mainland",
        name: "Mainland",
        slug: "mainland",
        area_type: "commercial_band",
        parent_id: "lagos",
      },
      {
        ...base,
        id: "yaba",
        name: "Yaba",
        slug: "yaba",
        area_type: "locality",
        parent_id: "mainland",
      },
    ];

    expect(formatOperatingAreaPath(areas[3], areas)).toBe("Nigeria → Lagos → Mainland → Yaba");
  });

  it("stops safely if legacy hierarchy data has a cycle", () => {
    const areas: OperatingArea[] = [
      {
        ...base,
        id: "a",
        name: "Area A",
        slug: "a",
        area_type: "locality",
        parent_id: "b",
      },
      {
        ...base,
        id: "b",
        name: "Area B",
        slug: "b",
        area_type: "locality",
        parent_id: "a",
      },
    ];

    expect(formatOperatingAreaPath(areas[0], areas)).toBe("Area B → Area A");
  });
});
