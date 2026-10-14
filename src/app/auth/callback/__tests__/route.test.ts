// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getSession: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("next/headers", () => ({
  cookies: () => ({ get: vi.fn(), set: vi.fn() }),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.createServerClient.mockReturnValue({ auth: mocks });
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test-token" } } });
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

async function destination(query: string) {
  const response = await GET(new Request(`https://www.swimbuddz.com/auth/callback?${query}`));
  return new URL(response.headers.get("location")!);
}

describe("password recovery callback", () => {
  it("sends missing codes to the existing reset page", async () => {
    const url = await destination("next=/reset-password");
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("error")).toBe("no_code");
    // Do not replace the fragment: browsers preserve Supabase's actual error.
    expect(url.hash).toBe("");
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("passes Supabase query errors to the reset page without exchanging a code", async () => {
    const url = await destination("next=/reset-password&error=access_denied&error_description=Email+link+has+expired&code=unused");
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("error")).toBe("Email link has expired");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("shows an exchange failure on the reset page", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: "code verifier should be non-empty" } });
    const url = await destination("next=/reset-password&code=test-code");
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("error")).toBe("code verifier should be non-empty");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows unexpected callback failures on the reset page", async () => {
    mocks.exchangeCodeForSession.mockRejectedValue(new Error("Service unavailable"));
    const url = await destination("next=/reset-password&code=test-code");
    expect(url.pathname).toBe("/reset-password");
    expect(url.searchParams.get("error")).toBe("Service unavailable");
  });

  it("preserves successful recovery and skips signup completion", async () => {
    const url = await destination("next=/reset-password&code=test-code");
    expect(url.href).toBe("https://www.swimbuddz.com/reset-password");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves successful sign-in and completes pending registration", async () => {
    const url = await destination("next=/account&code=test-code");
    expect(url.pathname).toBe("/account");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/pending-registrations/complete"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("keeps general failures on the new auth error page", async () => {
    const url = await destination("next=/account");
    expect(url.pathname).toBe("/auth/auth-code-error");
  });

  it("rejects an external next destination", async () => {
    const url = await destination("next=https://example.com&code=test-code");
    expect(url.href).toBe("https://www.swimbuddz.com/account");
  });
});
