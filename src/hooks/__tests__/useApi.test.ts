/**
 * Tests for the canonical GET-with-state hook (useApi.ts).
 *
 * useApi is the FU5 foundation — ~50 components migrate onto it as the
 * raw-`fetch()` cleanup proceeds — so its contract has to stay rock
 * solid. The subtle bits that regressions hide in:
 *
 *  - `path = null` / `enabled = false` → NO request (conditional fetch)
 *  - a thrown Error surfaces `err.message`; a non-Error throw surfaces
 *    a friendly fallback (never a raw exception — CLAUDE.md security
 *    guidance: components render `error` directly)
 *  - an AbortError is expected (unmount / path change) and must NOT be
 *    surfaced as a user-visible error
 *  - `auth` is forwarded to apiGet; `refetch()` re-runs without
 *    changing path; changing path re-fetches
 *
 * apiGet is mocked so we never hit the network and can drive each path
 * deterministically.
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
}));

import { useApi } from "../useApi";
import { apiGet } from "@/lib/api";

const mockedApiGet = vi.mocked(apiGet);

beforeEach(() => {
  mockedApiGet.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useApi", () => {
  it("resolves the happy path: loading flips, data set, no error", async () => {
    mockedApiGet.mockResolvedValueOnce({ id: "m1" });

    const { result } = renderHook(() => useApi<{ id: string }>("/members/me"));

    // Starts loading (enabled + non-null path).
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ id: "m1" });
    expect(result.current.error).toBeNull();
    expect(mockedApiGet).toHaveBeenCalledTimes(1);
  });

  it("skips the request when path is null", async () => {
    const { result } = renderHook(() => useApi("/x" === "/x" ? null : "/x"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApiGet).not.toHaveBeenCalled();
    expect(result.current.data).toBeNull();
  });

  it("skips the request when enabled is false", async () => {
    const { result } = renderHook(() =>
      useApi("/members/me", { enabled: false }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApiGet).not.toHaveBeenCalled();
  });

  it("surfaces err.message for a thrown Error", async () => {
    mockedApiGet.mockRejectedValueOnce(new Error("Member not found"));

    const { result } = renderHook(() => useApi("/members/me"));

    await waitFor(() => expect(result.current.error).toBe("Member not found"));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("surfaces a friendly fallback for a non-Error throw", async () => {
    mockedApiGet.mockRejectedValueOnce("a bare string, not an Error");

    const { result } = renderHook(() => useApi("/members/me"));

    await waitFor(() =>
      expect(result.current.error).toBe(
        "Something went wrong. Please try again.",
      ),
    );
  });

  it("does NOT surface an AbortError as a user-visible error", async () => {
    const abort = new DOMException("aborted", "AbortError");
    mockedApiGet.mockRejectedValueOnce(abort);

    const { result } = renderHook(() => useApi("/members/me"));

    // Give the rejected promise a tick to flow through .catch/.finally.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it("forwards auth:false and a signal to apiGet", async () => {
    mockedApiGet.mockResolvedValueOnce([]);

    renderHook(() => useApi("/members/directory", { auth: false }));

    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled());
    expect(mockedApiGet).toHaveBeenCalledWith(
      "/members/directory",
      expect.objectContaining({
        auth: false,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("defaults auth to true when not specified", async () => {
    mockedApiGet.mockResolvedValueOnce({});

    renderHook(() => useApi("/members/me"));

    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled());
    expect(mockedApiGet).toHaveBeenCalledWith(
      "/members/me",
      expect.objectContaining({ auth: true }),
    );
  });

  it("refetch() re-runs the request without changing path", async () => {
    mockedApiGet.mockResolvedValue({ n: 1 });

    const { result } = renderHook(() => useApi("/members/me"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockedApiGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2));
  });

  it("re-fetches when the path changes", async () => {
    mockedApiGet.mockResolvedValue({});

    const { rerender } = renderHook(({ path }) => useApi(path), {
      initialProps: { path: "/a" as string | null },
    });
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(1));
    expect(mockedApiGet).toHaveBeenLastCalledWith(
      "/a",
      expect.any(Object),
    );

    rerender({ path: "/b" });
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2));
    expect(mockedApiGet).toHaveBeenLastCalledWith(
      "/b",
      expect.any(Object),
    );
  });

  it("aborts the in-flight request on unmount", async () => {
    let capturedSignal: AbortSignal | undefined;
    mockedApiGet.mockImplementationOnce((_path, opts) => {
      capturedSignal = (opts as { signal?: AbortSignal } | undefined)?.signal;
      return new Promise(() => {
        /* never resolves — simulates a slow request */
      });
    });

    const { unmount } = renderHook(() => useApi("/slow"));
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled());
    expect(capturedSignal?.aborted).toBe(false);

    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
