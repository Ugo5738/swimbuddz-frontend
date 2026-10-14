import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordPage from "../page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  setSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ supabase: { auth: mocks } }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test" } } });
  mocks.verifyOtp.mockResolvedValue({ data: { session: { access_token: "recovery-account" } }, error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
});

describe("confirmation before redeeming a recovery token", () => {
  it("does not consume a token when an email scanner loads the page", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    render(<ResetPasswordPage />);
    expect(await screen.findByRole("button", { name: "Continue to reset password" })).toBeInTheDocument();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
    expect(window.location.hash).toBe("");
  });

  it("redeems the link account instead of trusting a different signed-in account", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    render(<ResetPasswordPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue to reset password" }));
    expect(await screen.findByLabelText(/^New password/)).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "email-token", type: "recovery" });
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(window.history.state.swimbuddzPasswordReset).toBeUndefined();
    fireEvent.change(screen.getByLabelText(/^New password/), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText(/^Confirm new password/), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByText("Password changed successfully")).toBeInTheDocument();
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("preserves pending verification across refresh instead of using an unrelated session", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    const first = render(<ResetPasswordPage />);
    await screen.findByRole("button", { name: "Continue to reset password" });
    first.unmount();
    render(<ResetPasswordPage />);
    expect(await screen.findByRole("button", { name: "Continue to reset password" })).toBeInTheDocument();
    expect(mocks.getSession).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Continue to reset password" }));
    await screen.findByLabelText(/^New password/);
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "email-token", type: "recovery" });
  });

  it("requires recovery type and never redeems a signup token", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=signup-token&type=signup");
    render(<ResetPasswordPage />);
    expect(await screen.findByText(/not a password reset link/)).toBeInTheDocument();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });

  it("shows an expired error only after the user tries to continue", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=expired-token&type=recovery");
    mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: { code: "otp_expired", message: "Token has expired" } });
    render(<ResetPasswordPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue to reset password" }));
    expect(await screen.findByText(/invalid, expired, or has already been used/)).toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("does not enable password updates without a verified session", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    mocks.verifyOtp.mockResolvedValue({ data: { session: null }, error: null });
    render(<ResetPasswordPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue to reset password" }));
    expect(await screen.findByText(/couldn't establish your reset session/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^New password/)).not.toBeInTheDocument();
  });

  it("keeps legacy direct query links behind the same confirmation step", async () => {
    window.history.replaceState({}, "", "/reset-password?token_hash=query-token&type=recovery");
    render(<ResetPasswordPage />);
    await screen.findByRole("button", { name: "Continue to reset password" });
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("handles network failures without leaving the verification button spinning", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    mocks.verifyOtp.mockRejectedValue(new Error("offline"));
    render(<ResetPasswordPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Continue to reset password" }));
    expect(await screen.findByText(/reopen the email link and try again/)).toBeInTheDocument();
  });

  it("prevents duplicate verification requests while one is pending", async () => {
    window.history.replaceState({}, "", "/reset-password#token_hash=email-token&type=recovery");
    let resolveVerification!: (value: unknown) => void;
    mocks.verifyOtp.mockReturnValue(new Promise(resolve => { resolveVerification = resolve; }));
    render(<ResetPasswordPage />);
    const button = await screen.findByRole("button", { name: "Continue to reset password" });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mocks.verifyOtp).toHaveBeenCalledOnce();
    expect(button).toBeDisabled();
    resolveVerification({ data: { session: { access_token: "recovery" } }, error: null });
    await waitFor(() => expect(screen.getByLabelText(/^New password/)).toBeInTheDocument());
  });
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
