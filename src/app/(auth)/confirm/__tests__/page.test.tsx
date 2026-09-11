import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ConfirmPage from "../page";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
  setSession: vi.fn(),
  complete: vi.fn(),
  destination: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/auth", () => ({ supabase: { auth: mocks } }));
vi.mock("@/lib/registration", () => ({
  completePendingRegistrationOnBackend: mocks.complete,
  getPostAuthRedirectPath: mocks.destination,
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/confirm");
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: "test" } } });
  mocks.getUser.mockResolvedValue({ data: { user: { user_metadata: {} } } });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.verifyOtp.mockResolvedValue({ error: null });
  mocks.complete.mockResolvedValue({ status: "complete" });
  mocks.destination.mockResolvedValue("/account/onboarding?next=cohort");
});

describe("Academy confirmation return path", () => {
  it("preserves the email destination ahead of an old same-tab destination", async () => {
    window.history.replaceState({}, "", "/confirm?next=%2Faccount%2Facademy%2Fcohorts%2Fselected");
    window.sessionStorage.setItem("post_auth_next", "/account/academy/cohorts/old");
    render(<ConfirmPage />);
    await waitFor(() =>
      expect(mocks.destination).toHaveBeenCalledWith("/account/academy/cohorts/selected")
    );
    expect(window.sessionStorage.getItem("post_auth_next")).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith("/account/onboarding?next=cohort");
  });

  it("recovers and consumes the signup destination in another browser", async () => {
    window.history.replaceState({}, "", "/confirm?token_hash=test&type=signup");
    mocks.getUser.mockResolvedValue({
      data: {
        user: { user_metadata: { registration_return_to: "/account/academy/cohorts/selected" } },
      },
    });
    render(<ConfirmPage />);
    await waitFor(() =>
      expect(mocks.destination).toHaveBeenCalledWith("/account/academy/cohorts/selected")
    );
    expect(mocks.complete).toHaveBeenCalledOnce();
    expect(mocks.updateUser).toHaveBeenCalledWith({ data: { registration_return_to: null } });
  });

  it("keeps an explicit destination when the metadata lookup is unavailable", async () => {
    window.history.replaceState({}, "", "/confirm?next=%2Faccount%2Facademy%2Fcohorts%2Fselected");
    mocks.getUser.mockRejectedValue(new Error("offline"));
    render(<ConfirmPage />);
    await waitFor(() =>
      expect(mocks.destination).toHaveBeenCalledWith("/account/academy/cohorts/selected")
    );
  });

  it("does not continue to onboarding when verification fails", async () => {
    window.history.replaceState({}, "", "/confirm?token_hash=test&type=signup");
    mocks.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    render(<ConfirmPage />);
    expect(
      await screen.findByText("This confirmation link has expired. Please request a new one.")
    ).toBeInTheDocument();
    expect(mocks.destination).not.toHaveBeenCalled();
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
