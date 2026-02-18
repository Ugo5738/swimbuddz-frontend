/**
 * Tests for config utility functions.
 *
 * Covers buildApiUrl and apiEndpoints construction.
 */
import { describe, expect, it } from "vitest";
import { API_BASE_URL, apiEndpoints, buildApiUrl } from "../config";

describe("API_BASE_URL", () => {
  it("is set from environment variable", () => {
    // vitest.setup.ts sets NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8000'
    expect(API_BASE_URL).toBe("http://localhost:8000");
  });
});

describe("apiEndpoints", () => {
  it("has all expected endpoint keys", () => {
    expect(apiEndpoints.members).toBeDefined();
    expect(apiEndpoints.sessions).toBeDefined();
    expect(apiEndpoints.academy).toBeDefined();
    expect(apiEndpoints.payments).toBeDefined();
    expect(apiEndpoints.attendance).toBeDefined();
    expect(apiEndpoints.media).toBeDefined();
    expect(apiEndpoints.transport).toBeDefined();
    expect(apiEndpoints.volunteers).toBeDefined();
  });

  it("prepends base URL to all endpoints", () => {
    expect(apiEndpoints.members).toBe("http://localhost:8000/api/v1/members");
    expect(apiEndpoints.sessions).toBe("http://localhost:8000/api/v1/sessions");
    expect(apiEndpoints.academy).toBe("http://localhost:8000/api/v1/academy");
    expect(apiEndpoints.payments).toBe("http://localhost:8000/api/v1/payments");
  });
});

describe("buildApiUrl", () => {
  it("builds URL from endpoint path", () => {
    const url = buildApiUrl("/api/v1/members");
    expect(url).toBe("http://localhost:8000/api/v1/members");
  });

  it("appends query parameters", () => {
    const url = buildApiUrl("/api/v1/members", { skip: "0", limit: 10 });
    expect(url).toContain("skip=0");
    expect(url).toContain("limit=10");
  });

  it("handles empty params", () => {
    const url = buildApiUrl("/api/v1/sessions");
    expect(url).toBe("http://localhost:8000/api/v1/sessions");
    expect(url).not.toContain("?");
  });

  it("converts numeric params to strings", () => {
    const url = buildApiUrl("/api/v1/test", { page: 2, size: 50 });
    expect(url).toContain("page=2");
    expect(url).toContain("size=50");
  });
});
