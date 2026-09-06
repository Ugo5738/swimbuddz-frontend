import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClubPlan } from "@/lib/clubOnboarding";
import ClubPlanSelectionPage from "../page";

const mocks = vi.hoisted(() => ({
  plans: [] as ClubPlan[],
  create: vi.fn(),
  submitAssessment: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/clubOnboarding", () => ({
  createClubApplication: mocks.create,
  submitClubPreAssessment: mocks.submitAssessment,
}));
vi.mock("@/lib/upgradeContext", () => ({
  formatCurrency: (amount: number) => `₦${amount.toLocaleString()}`,
  useUpgrade: () => ({
    setClubApplicationId: vi.fn(),
    state: {
      clubReadinessData: {
        canSwim25mContinuously: true, controlledBreathing: true,
        comfortableInDeepWater: true, canFloatOrTread30Seconds: true,
        canStopAndRecover: true,
      },
    },
  }),
}));
vi.mock("@/hooks/useApi", () => ({
  useApi: (path: string | null) => ({
    loading: false, error: null, refetch: vi.fn(),
    data: path === "/api/v1/clubs/plans" ? mocks.plans
      : path === "/api/v1/pools/operating-areas" ? [{ id: "mainland", name: "Mainland" }]
      : path?.startsWith("/api/v1/pools?") ? { items: [{ id: "rowe", name: "Rowe Park" }] }
      : [],
  }),
}));

function plan(id: string, start: string, end: string): ClubPlan {
  return {
    id, club_id: "yaba", club_name: "Yaba Club", club_slug: "yaba", location: "Yaba",
    operating_area_id: "mainland", pool_id: "rowe", default_pool_id: "rowe",
    name: id, billing_cycle: "quarterly", currency: "NGN", club_fee_kobo: 6_500_000,
    current_price_kobo: 6_500_000, sessions_included: 13, remaining_sessions: 13,
    minimum_entry_sessions: 5, period_start: start, period_end: end,
    entry_available: true, entry_reason: null, refreshments_included: true,
    capacity: null, premium_venue_note: null, effective_from: "2026-09-01",
    effective_to: null, is_active: true, community_experience_fee_kobo: 3_000_000,
    community_experience_default_selected: true, community_experience_offering_id: null,
  };
}

function chooseLocation() {
  fireEvent.click(screen.getByRole("button", { name: /Mainland/ }));
  fireEvent.click(screen.getByRole("button", { name: /Rowe Park/ }));
}

describe("Club plan application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plans = [
      plan("q4", "2026-10-01", "2026-12-31"),
      plan("q1", "2027-01-01", "2027-03-31"),
      plan("q2", "2027-04-01", "2027-06-30"),
    ];
    mocks.create.mockResolvedValue({ id: "application", status: "assessment_required" });
    mocks.submitAssessment.mockResolvedValue({});
  });

  it("keeps the entry quarter required and submits independently selected future quarters", async () => {
    render(<ClubPlanSelectionPage />);
    chooseLocation();
    expect(screen.getByRole("checkbox", { name: /Q4 2026/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Q2 2027/ }));
    expect(screen.getByRole("checkbox", { name: /Q1 2027/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("checkbox", { name: /Q1 2027/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Q1 2027/ }));
    expect(screen.getByRole("checkbox", { name: /Q2 2027/ })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: /Submit for Club assessment/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      plan_version_id: "q4", plan_version_ids: ["q2"], community_experience_selected: false,
    })));
  });

  it("does not offer or submit a fee-only Community Experience despite a saved default", async () => {
    render(<ClubPlanSelectionPage />);
    chooseLocation();
    expect(screen.queryByRole("checkbox", { name: /Community Experience/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Submit for Club assessment/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      community_experience_selected: false,
    })));
  });

  it("retains the configured default and opt-out for a linked quarterly Experience", async () => {
    mocks.plans[0].community_experience_offering_id = "q4-experience";
    render(<ClubPlanSelectionPage />);
    chooseLocation();
    const experience = screen.getByRole("checkbox", { name: /Community Experience/ });
    expect(experience).toBeChecked();
    fireEvent.click(experience);
    fireEvent.click(screen.getByRole("button", { name: /Submit for Club assessment/ }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      community_experience_selected: false,
    })));
  });
});
