import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminLayout } from "../AdminLayout";

const apiGet = vi.fn();
vi.mock("@/lib/api", () => ({ apiGet: (...args: unknown[]) => apiGet(...args) }));
vi.mock("@/lib/auth", () => ({
  supabase: { auth: {
    getUser: vi.fn(async () => ({ data: { user: { app_metadata: { roles: ["admin"] } } } })),
  } },
}));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("next/image", () => ({ default: () => null }));

const orderPath = "/api/v1/admin/store/orders/new-count";
const paymentPath = "/api/v1/payments/admin/pending-reviews";
const calls = (path: string) => apiGet.mock.calls.filter(([url]) => url === path).length;

function visibility(value: "hidden" | "visible") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
  document.dispatchEvent(new Event("visibilitychange"));
}

describe("AdminLayout queue request budget", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    apiGet.mockReset();
    apiGet.mockImplementation(async (path: string) => path === orderPath ? { new_count: 0 } : []);
    visibility("visible");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("skips hidden initial/interval loads and refreshes immediately on return", async () => {
    visibility("hidden");
    await act(async () => { render(<AdminLayout>Content</AdminLayout>); });
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });
    expect(calls(orderPath)).toBe(0);
    expect(calls(paymentPath)).toBe(0);
    await act(async () => { visibility("visible"); });
    expect(calls(orderPath)).toBe(1);
    expect(calls(paymentPath)).toBe(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(calls(orderPath)).toBe(2);
    await act(async () => { visibility("hidden"); await vi.advanceTimersByTimeAsync(60_000); });
    expect(calls(orderPath)).toBe(2);
  });

  it("does not overlap either queue while a slow request remains in flight", async () => {
    let finish!: (value: { new_count: number }) => void;
    apiGet.mockImplementation((path: string) => path === orderPath
      ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve([]));
    await act(async () => { render(<AdminLayout>Content</AdminLayout>); });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(90_000);
      visibility("hidden"); visibility("visible");
    });
    expect(calls(orderPath)).toBe(1);
    expect(calls(paymentPath)).toBe(1);
    await act(async () => { finish({ new_count: 0 }); });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(calls(orderPath)).toBe(2);
    expect(calls(paymentPath)).toBe(2);
  });

  it("removes timers and visibility listeners on unmount", async () => {
    const view = render(<AdminLayout>Content</AdminLayout>);
    await act(async () => {});
    expect(calls(orderPath)).toBe(1);
    view.unmount();
    await act(async () => {
      visibility("hidden"); visibility("visible");
      await vi.advanceTimersByTimeAsync(90_000);
    });
    expect(calls(orderPath)).toBe(1);
    expect(calls(paymentPath)).toBe(1);
  });
});
