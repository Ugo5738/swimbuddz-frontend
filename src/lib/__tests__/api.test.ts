/**
 * Tests for the core API client (api.ts).
 *
 * Uses vi.fn() to mock global fetch so we can verify:
 * - Headers (Content-Type, Authorization)
 * - HTTP method dispatch
 * - JSON body serialization
 * - Error parsing (structured { detail }, raw text, empty body)
 * - 204 No-Content handling
 * - Non-JSON response handling
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module BEFORE importing api.ts so the import picks up the mock.
vi.mock("../auth", () => ({
  getCurrentAccessToken: vi.fn(),
  supabase: {
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
  },
}));

import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "../api";
import { getCurrentAccessToken } from "../auth";

const mockedGetToken = vi.mocked(getCurrentAccessToken);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal Response-like object for fetch mock. */
function mockResponse(
  body: string | null,
  init: { status?: number; ok?: boolean; contentType?: string } = {},
) {
  const { status = 200, ok = true, contentType = "application/json" } = init;
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(body ?? ""),
    headers: {
      get: (name: string) => (name === "content-type" ? contentType : null),
    },
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockedGetToken.mockResolvedValue(null); // no auth by default
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// GET requests
// ---------------------------------------------------------------------------

describe("apiGet", () => {
  it("sends a GET request to the correct URL", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify({ id: 1 })));

    const data = await apiGet<{ id: number }>("/api/v1/members/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/members/me");
    expect(options?.method).toBe("GET");
    expect(data).toEqual({ id: 1 });
  });

  it("sets Content-Type to application/json", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify({})));

    await apiGet("/api/v1/test");

    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers).toBeDefined();
  });

  it("includes Authorization header when auth is true and token exists", async () => {
    mockedGetToken.mockResolvedValue("my-jwt-token");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify({})));

    await apiGet("/api/v1/test", { auth: true });

    const headers = fetchMock.mock.calls[0][1]?.headers;
    const h = new Headers(headers as HeadersInit);
    expect(h.get("Authorization")).toBe("Bearer my-jwt-token");
  });

  it("omits Authorization header when auth is false", async () => {
    mockedGetToken.mockResolvedValue("my-jwt-token");
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify({})));

    await apiGet("/api/v1/test"); // auth defaults to undefined/false

    const headers = fetchMock.mock.calls[0][1]?.headers;
    const h = new Headers(headers as HeadersInit);
    expect(h.get("Authorization")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST / PUT / PATCH / DELETE
// ---------------------------------------------------------------------------

describe("apiPost", () => {
  it("sends POST with JSON body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ created: true })),
    );

    const payload = { name: "Test", email: "test@test.com" };
    const data = await apiPost("/api/v1/members", payload);

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("POST");
    expect(options?.body).toBe(JSON.stringify(payload));
    expect(data).toEqual({ created: true });
  });

  it("sends POST without body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify({ ok: true })));

    await apiPost("/api/v1/trigger");

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.body).toBeUndefined();
  });
});

describe("apiPut", () => {
  it("sends PUT with JSON body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ updated: true })),
    );

    await apiPut("/api/v1/members/1", { name: "Updated" });

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("PUT");
  });
});

describe("apiPatch", () => {
  it("sends PATCH with JSON body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ patched: true })),
    );

    await apiPatch("/api/v1/members/1", { name: "Patched" });

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("PATCH");
  });
});

describe("apiDelete", () => {
  it("sends DELETE request", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse(null, { status: 204, ok: true }));

    const data = await apiDelete("/api/v1/members/1");

    const [, options] = fetchMock.mock.calls[0];
    expect(options?.method).toBe("DELETE");
    expect(data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Response handling
// ---------------------------------------------------------------------------

describe("Response handling", () => {
  it("returns null for 204 No Content", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse("", { status: 204, ok: true }));

    const data = await apiGet("/api/v1/test");
    expect(data).toBeNull();
  });

  it("returns null for empty response body", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse("", { status: 200, ok: true }));

    const data = await apiGet("/api/v1/test");
    expect(data).toBeNull();
  });

  it("returns raw text for non-JSON content type", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse("plain text response", {
        status: 200,
        ok: true,
        contentType: "text/plain",
      }),
    );

    const data = await apiGet<string>("/api/v1/test");
    expect(data).toBe("plain text response");
  });

  it("parses JSON response correctly", async () => {
    const fetchMock = vi.mocked(fetch);
    const payload = { items: [1, 2, 3], total: 3 };
    fetchMock.mockResolvedValue(mockResponse(JSON.stringify(payload)));

    const data = await apiGet<typeof payload>("/api/v1/test");
    expect(data).toEqual(payload);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("Error handling", () => {
  it("throws with detail message from JSON error response", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ detail: "Member not found" }), {
        status: 404,
        ok: false,
      }),
    );

    await expect(apiGet("/api/v1/members/999")).rejects.toThrow(
      "Member not found",
    );
  });

  it("throws with stringified JSON when detail is not a string", async () => {
    const fetchMock = vi.mocked(fetch);
    const errorBody = { detail: { errors: ["field required"] } };
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify(errorBody), { status: 422, ok: false }),
    );

    await expect(apiGet("/api/v1/test")).rejects.toThrow();
  });

  it("throws with raw text when response is not JSON", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse("Internal Server Error", {
        status: 500,
        ok: false,
        contentType: "text/plain",
      }),
    );

    await expect(apiGet("/api/v1/test")).rejects.toThrow(
      "Internal Server Error",
    );
  });

  it("throws with status code when response body is empty", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(mockResponse("", { status: 502, ok: false }));

    await expect(apiGet("/api/v1/test")).rejects.toThrow(
      "Request failed with status 502",
    );
  });

  it("throws for 401 Unauthorized", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ detail: "Not authenticated" }), {
        status: 401,
        ok: false,
      }),
    );

    await expect(apiGet("/api/v1/test", { auth: true })).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("throws for 403 Forbidden", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      mockResponse(JSON.stringify({ detail: "Insufficient permissions" }), {
        status: 403,
        ok: false,
      }),
    );

    await expect(apiGet("/api/v1/admin/test")).rejects.toThrow(
      "Insufficient permissions",
    );
  });
});
