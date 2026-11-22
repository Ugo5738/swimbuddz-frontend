import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  redirectParam: null as string | null,
  signInWithPassword: vi.fn(),
  signInWithOtp: vi.fn(),
  getSession: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect" ? mocks.redirectParam : null),
  }),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAccessToken: vi.fn().mockResolvedValue("token-1"),
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signInWithOtp: mocks.signInWithOtp,
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("@/lib/api", () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
}));

describe("LoginPage redirect preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirectParam = null;
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.apiPost.mockResolvedValue({});
  });

  it("returns directly to /store/checkout after password login even when Academy upgrade is pending", async () => {
    mocks.redirectParam = "/store/checkout";
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "user-1", app_metadata: { roles: ["member"] } } },
      error: null,
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: "contactugodaniels@gmail.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/store/checkout"));
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });

  it("preserves /store/checkout for admin password login", async () => {
    mocks.redirectParam = "/store/checkout";
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1", app_metadata: { roles: ["admin"] } } },
      error: null,
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: "admin@admin.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/store/checkout"));
  });

  it("still defaults plain admin password login to /admin/dashboard when no redirect is set", async () => {
    mocks.redirectParam = null;
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: { id: "admin-1", app_metadata: { roles: ["admin"] } } },
      error: null,
    });

    const { container } = render(<LoginPage />);
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: "admin@admin.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "secret-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/admin/dashboard"));
  });

  it("redirects already-signed-in admins straight to /store/checkout when visiting /login?redirect=/store/checkout", async () => {
    mocks.redirectParam = "/store/checkout";
    mocks.getSession.mockResolvedValue({
      data: {
        session: { user: { id: "admin-1", app_metadata: { roles: ["admin"] } } },
      },
    });

    render(<LoginPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/store/checkout"));
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });
});
