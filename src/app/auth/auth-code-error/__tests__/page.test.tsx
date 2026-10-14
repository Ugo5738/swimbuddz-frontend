import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthCodeErrorPage from "../page";

describe("legacy auth error page", () => {
  it("handles the exact no_code plus expired-token URL previously returning 404", async () => {
    window.history.replaceState({}, "", "/auth/auth-code-error?error=no_code#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=");
    render(<AuthCodeErrorPage />);
    expect(await screen.findByText(/invalid, expired, or has already been used/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Request a new password reset link" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
  });
});
