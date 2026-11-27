import { describe, expect, it } from "vitest";
import { allowedStoreOrderStatuses } from "./storeOrderStatuses";

describe("store admin order status transitions", () => {
  it("does not let unverified orders be marked paid or fulfilled", () => {
    expect(allowedStoreOrderStatuses("pending_payment")).toEqual([
      "pending_payment",
      "cancelled",
    ]);
    expect(allowedStoreOrderStatuses("payment_failed")).not.toContain("picked_up");
  });

  it("allows the operational pickup lifecycle only after confirmation", () => {
    expect(allowedStoreOrderStatuses("paid")).toContain("processing");
    expect(allowedStoreOrderStatuses("processing")).toContain("ready_for_pickup");
    expect(allowedStoreOrderStatuses("ready_for_pickup")).toContain("picked_up");
  });

  it("does not allow delivered or picked-up orders to regress", () => {
    expect(allowedStoreOrderStatuses("picked_up")).toEqual(["picked_up"]);
    expect(allowedStoreOrderStatuses("delivered")).toEqual(["delivered"]);
    expect(allowedStoreOrderStatuses("unexpected")).toEqual(["unexpected"]);
  });

  it("blocks direct raw cancellation of paid orders so refunds are never skipped (ADR-024)", () => {
    expect(allowedStoreOrderStatuses("paid")).not.toContain("cancelled");
    expect(allowedStoreOrderStatuses("processing")).not.toContain("cancelled");
    expect(allowedStoreOrderStatuses("ready_for_pickup")).not.toContain("cancelled");
    expect(allowedStoreOrderStatuses("shipped")).not.toContain("cancelled");
  });

  it("filters processing transitions by fulfillment type and lets shipped pickup orders complete cleanly", () => {
    expect(allowedStoreOrderStatuses("processing", "pickup")).toEqual([
      "processing",
      "ready_for_pickup",
    ]);
    expect(allowedStoreOrderStatuses("processing", "delivery")).toEqual([
      "processing",
      "shipped",
    ]);
    expect(allowedStoreOrderStatuses("shipped", "pickup")).toEqual([
      "shipped",
      "picked_up",
      "delivered",
    ]);
    expect(allowedStoreOrderStatuses("shipped", "delivery")).toEqual([
      "shipped",
      "delivered",
    ]);
  });
});
