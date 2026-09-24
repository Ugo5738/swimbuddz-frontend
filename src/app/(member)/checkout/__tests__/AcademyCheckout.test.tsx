import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutPage from "../page";

const mocks = vi.hoisted(() => ({
  params: "purpose=academy_cohort&cohort_id=september",
  get: vi.fn(),
  post: vi.fn(),
  preview: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
  setSelectedCohort: vi.fn(),
  state: {
    discountCode: "",
    selectedCohortId: "september" as string | null,
    selectedCohort: { id: "september", name: "September" },
    lateJoinPreferences: null as { notes: string } | null,
  },
  enrollments: [] as {
    id: string; cohort_id: string; status: string; payment_status: string;
  }[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => new URLSearchParams(mocks.params),
}));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post }));
vi.mock("@/lib/clubOnboarding", () => ({ previewAcademyCheckout: mocks.preview }));
vi.mock("@/lib/upgradeContext", () => ({
  UpgradeProvider: ({ children }: { children: React.ReactNode }) => children,
  useUpgrade: () => ({
    state: mocks.state,
    clearState: vi.fn(),
    setDiscountCode: vi.fn(),
    setSelectedCohort: mocks.setSelectedCohort,
  }),
  formatCurrency: (value: number) => `₦${value.toLocaleString()}`,
  getClubCycleLabel: () => "Quarterly",
}));
vi.mock("@/lib/paymentCache", () => ({ savePaymentIntentCache: vi.fn() }));

describe("Academy checkout enrollment preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = "purpose=academy_cohort&cohort_id=september";
    mocks.state.selectedCohortId = "september";
    mocks.state.selectedCohort = { id: "september", name: "September" };
    mocks.state.lateJoinPreferences = null;
    mocks.enrollments = [];
    mocks.get.mockImplementation(async (path: string) => {
      if (path.endsWith("/my-enrollments")) return mocks.enrollments;
      if (path.endsWith("/pricing")) return { community_annual: 20000 };
      if (path.includes("/cohorts/")) return { id: "september", name: "September" };
      return { id: "member" };
    });
    mocks.post.mockResolvedValue({ id: "new-enrollment", status: "pending_approval" });
    mocks.preview.mockResolvedValue({
      currency: "NGN", total_kobo: 20_000_000, subtotal_kobo: 20_000_000,
      components: { academy: 20_000_000 }, additional_charges: [],
    });
  });

  it("takes a first-time member from cohort selection to a priced checkout", async () => {
    const view = render(<CheckoutPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith(
      "/checkout?purpose=academy_cohort&cohort_id=september&enrollment_id=new-enrollment"
    ));
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/academy/enrollments/me", { cohort_id: "september" }, { auth: true }
    );
    mocks.enrollments = [{
      id: "new-enrollment", cohort_id: "september", status: "pending_approval", payment_status: "pending",
    }];
    mocks.params += "&enrollment_id=new-enrollment";
    view.rerender(<CheckoutPage />);
    expect(await screen.findByRole("heading", { name: "Review & Pay" })).toBeInTheDocument();
    expect(mocks.preview).toHaveBeenCalledWith("new-enrollment", false, "paystack", undefined, {});
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it.each(["february", null])("uses the URL cohort when stored selection is %s", async (storedId) => {
    mocks.state.selectedCohortId = storedId;
    mocks.state.selectedCohort = { id: storedId || "", name: "Old selection" };
    mocks.state.lateJoinPreferences = { notes: "Only for February" };
    render(<CheckoutPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalled());
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/academy/enrollments/me", { cohort_id: "september" }, { auth: true }
    );
    expect(mocks.get).toHaveBeenCalledWith("/api/v1/academy/cohorts/september", { auth: true });
  });

  it("resumes the unpaid enrollment, ignoring an older dropped enrollment", async () => {
    mocks.post.mockRejectedValue(new Error("You already have a pending request for this cohort"));
    mocks.enrollments = [
      { id: "old", cohort_id: "september", status: "dropped", payment_status: "pending" },
      { id: "pending", cohort_id: "september", status: "pending_approval", payment_status: "pending" },
    ];
    render(<CheckoutPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith(
      "/checkout?purpose=academy_cohort&cohort_id=september&enrollment_id=pending"
    ));
  });

  it.each([
    ["enrolled", "paid"], ["waitlist", "pending"],
  ])("opens the enrollment instead of collecting payment for %s / %s", async (status, payment_status) => {
    mocks.post.mockRejectedValue(new Error("You are already enrolled in this cohort"));
    mocks.enrollments = [{ id: "existing", cohort_id: "september", status, payment_status }];
    render(<CheckoutPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith(
      "/account/academy/enrollments/existing"
    ));
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(screen.queryByText("Checkout Error")).not.toBeInTheDocument();
  });

  it("preserves the actionable server explanation for a conflict in another cohort", async () => {
    const message = "You already have an active enrollment in this program (October). To switch cohorts, drop your existing enrollment first or contact support.";
    mocks.post.mockRejectedValue(new Error(message));
    mocks.enrollments = [{ id: "other", cohort_id: "october", status: "enrolled", payment_status: "paid" }];
    render(<CheckoutPage />);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByText("No unpaid Academy enrollment is available")).not.toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("does not quote a paid enrollment when reopening an old checkout link", async () => {
    mocks.params += "&enrollment_id=paid";
    mocks.enrollments = [{ id: "paid", cohort_id: "september", status: "enrolled", payment_status: "paid" }];
    render(<CheckoutPage />);
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith(
      "/account/academy/enrollments/paid"
    ));
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});
