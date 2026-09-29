import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareCheckout } from "../checkoutPreparation";
vi.mock("@/lib/api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

describe("checkout preparation retries", () => {
  beforeEach(() => { vi.useRealTimers(); });
  it("recovers a transient error without changing the requested operation", async () => {
    const operation = vi.fn().mockRejectedValueOnce(Object.assign(new Error("Unavailable"), { status: 503 })).mockResolvedValue({ total: 55000 });
    expect(await prepareCheckout("test-quote", operation)).toEqual({ total: 55000 });
    expect(operation).toHaveBeenCalledTimes(2);
  });
  it.each([400, 401, 403, 409, 422])("preserves %s business failures immediately", async (status) => {
    const error = Object.assign(new Error("Actionable explanation"), { status });
    const operation = vi.fn().mockRejectedValue(error);
    await expect(prepareCheckout("test-quote", operation)).rejects.toBe(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
