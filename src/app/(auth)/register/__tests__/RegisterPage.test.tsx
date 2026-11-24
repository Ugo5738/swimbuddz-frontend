import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationEssentialsStep } from "@/components/registration/RegistrationEssentialsStep";
import RegisterPage from "../page";

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  params: new URLSearchParams(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  createPendingRegistration: vi.fn(),
  getPostAuthRedirectPath: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params,
}));

vi.mock("next/dynamic", () => ({
  default: () => RegistrationEssentialsStep,
}));

vi.mock("react-phone-number-input", () => ({
  default: ({
    id,
    value,
    onChange,
    placeholder,
  }: {
    id?: string;
    value?: string;
    onChange: (value?: string) => void;
    placeholder?: string;
  }) => (
    <input
      id={id}
      type="tel"
      placeholder={placeholder}
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock("@/lib/api", () => ({
  apiGet: mocks.apiGet,
  apiPatch: mocks.apiPatch,
}));

vi.mock("@/lib/auth", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

vi.mock("@/lib/registration", () => ({
  createPendingRegistration: mocks.createPendingRegistration,
  getPostAuthRedirectPath: mocks.getPostAuthRedirectPath,
}));

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = new URLSearchParams();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.createPendingRegistration.mockResolvedValue(undefined);
    mocks.getPostAuthRedirectPath.mockResolvedValue("/account");
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });

  it("lets a regular customer register with identity fields only and sends undefined for omitted profile fields", async () => {
    render(<RegisterPage />);

    // Contact details and swim level are hidden for regular accounts.
    expect(screen.queryByLabelText(/Phone Number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Swimming Level/i)).not.toBeInTheDocument();
    // Acquisition source remains visible as an optional attribution field.
    const acquisitionSelect = screen.getByLabelText(/How did you hear about SwimBuddz\? \(optional\)/i);
    expect(acquisitionSelect).not.toBeRequired();

    const nextButton = screen.getByRole("button", { name: "Next Step" });
    expect(nextButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: " Ada " } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: " Okafor " } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: " ada@example.com " },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "swimpassword123" },
    });

    // Valid without filling phone/state/city or acquisition source.
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);

    // Step 2: Confirm & Finish
    const submitButton = screen.getByRole("button", { name: "Submit Registration" });
    expect(submitButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mocks.createPendingRegistration).toHaveBeenCalledTimes(1);
    });

    expect(mocks.createPendingRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ada@example.com",
        first_name: "Ada",
        last_name: "Okafor",
        password: "swimpassword123",
        phone: undefined,
        city: undefined,
        state: undefined,
        country: undefined,
        swim_level: undefined,
        acquisition_source: undefined,
        requested_membership_tiers: undefined,
      })
    );
    expect(mocks.router.push).toHaveBeenCalledWith("/register/success");
  });

  it("preserves optional acquisition_source and goal destination across signup", async () => {
    mocks.params = new URLSearchParams("goal=club");
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Tunde" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Bello" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "tunde@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "swimpassword123" },
    });
    fireEvent.change(screen.getByLabelText(/How did you hear about SwimBuddz\? \(optional\)/i), {
      target: { value: "social_instagram" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Submit Registration" }));

    await waitFor(() => {
      expect(mocks.createPendingRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          return_to: "/upgrade/club/readiness",
          acquisition_source: "social_instagram",
          discovery_source: "social_instagram",
          requested_membership_tiers: ["club"],
        })
      );
    });
    expect(mocks.router.push).toHaveBeenCalledWith(
      "/register/success?next=%2Fupgrade%2Fclub%2Freadiness"
    );
  });

  it("still requires contact details for coach registration", () => {
    mocks.params = new URLSearchParams("coach=true");
    render(<RegisterPage />);

    const submitButton = screen.getByRole("button", { name: "Submit Registration" });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: "Coach" } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: "Ngozi" } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "coach@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "coachpass123" },
    });

    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Enter phone number/i), {
      target: { value: "+2348012345678" },
    });
    fireEvent.change(screen.getByLabelText(/^State/i), { target: { value: "Lagos" } });
    fireEvent.change(screen.getByLabelText(/City \/ Area/i), { target: { value: "Yaba" } });

    expect(submitButton).toBeEnabled();
  });

  it("redirects already-authenticated visitors from /register?goal=club straight to Club readiness", async () => {
    mocks.params = new URLSearchParams("goal=club");
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", app_metadata: { roles: ["member"] } } } },
      error: null,
    });

    render(<RegisterPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/upgrade/club/readiness");
    });
  });

  it("redirects already-authenticated visitors from bare /register via getPostAuthRedirectPath", async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", app_metadata: { roles: ["member"] } } } },
      error: null,
    });
    mocks.getPostAuthRedirectPath.mockResolvedValue("/explore");

    render(<RegisterPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/explore");
    });
  });

  it("does not redirect authenticated members away from /register?upgrade=true", async () => {
    mocks.params = new URLSearchParams("upgrade=true");
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: "user-1", app_metadata: { roles: ["member"] } } } },
      error: null,
    });
    mocks.apiGet.mockResolvedValue({
      first_name: "Ada",
      last_name: "Okafor",
      email: "ada@example.com",
      membership_tiers: ["community"],
    });

    render(<RegisterPage />);

    await waitFor(() => {
      expect(screen.getByText("Choose Your Next Programme")).toBeInTheDocument();
    });
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
