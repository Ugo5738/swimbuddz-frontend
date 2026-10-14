import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResetPasswordPage from "../page";

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ supabase: { auth: mocks } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test" } } });
});

describe("reset link errors", () => {
  it("shows the actual expired-link fragment ahead of the callback's no_code query", async () => {
    window.history.replaceState({}, "", "/reset-password?error=no_code#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    render(<ResetPasswordPage />);
    expect(await screen.findByText(/invalid, expired, or has already been used/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new reset link" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
    // An existing signed-in session must not override a failed reset link.
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("explains a missing browser verifier", async () => {
    window.history.replaceState({}, "", "/reset-password?error=invalid+request%3A+both+auth+code+and+code+verifier+should+be+non-empty");
    render(<ResetPasswordPage />);
    expect(await screen.findByText(/same browser and device/)).toBeInTheDocument();
  });

  it("keeps the password form available after a successful callback", async () => {
    window.history.replaceState({}, "", "/reset-password");
    render(<ResetPasswordPage />);
    expect(await screen.findByLabelText(/^New password/)).toBeInTheDocument();
  });
});
