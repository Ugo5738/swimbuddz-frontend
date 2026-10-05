import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClubLocationTransferPanel } from "../ClubLocationTransferPanel";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  plans: vi.fn(),
  pods: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiGet: mocks.get,
  apiPost: mocks.post,
}));

vi.mock("@/lib/clubOnboarding", () => ({
  listAllClubPlans: mocks.plans,
}));

vi.mock("@/lib/pods", () => ({
  adminListPods: mocks.pods,
}));

const sourceEnrollment = {
  id: "enrollment-yaba",
  member_id: "member-ay",
  club_id: "club-yaba",
  club_name: "SwimBuddz Yaba",
  plan_version_id: "plan-yaba",
  plan_name: "Yaba Q4",
  payment_mode: "transition_per_session",
  starts_at: "2026-10-01T00:00:00Z",
  ends_at: "2027-01-01T00:00:00Z",
  status: "active",
  assigned_pod_id: null,
};

const targetPlan = {
  id: "plan-vi",
  club_id: "club-vi",
  club_name: "SwimBuddz VI",
  name: "VI Q4",
  period_start: "2026-10-01",
  period_end: "2026-12-31",
  is_active: true,
  published_at: "2026-10-01T00:00:00Z",
};

const transitionPreview = {
  source_enrollment_id: "enrollment-yaba",
  member_id: "member-ay",
  source_club_id: "club-yaba",
  source_club_name: "SwimBuddz Yaba",
  target_club_id: "club-vi",
  target_club_name: "SwimBuddz VI",
  target_plan_version_id: "plan-vi",
  target_plan_name: "VI Q4",
  target_pod_id: null,
  payment_mode: "transition_per_session",
  effective_at: "2026-10-04T09:00:00Z",
  source_remaining_sessions: 0,
  source_remaining_value_kobo: 0,
  target_remaining_sessions: 12,
  target_remaining_value_kobo: 7200000,
  estimated_difference_kobo: 7200000,
  can_execute_now: true,
  requires_financial_reconciliation: false,
  guidance:
    "This transition-per-session membership can move now. No second quarter fee is collected.",
};

async function chooseTarget() {
  await screen.findByRole("option", { name: /SwimBuddz VI · VI Q4/ });
  fireEvent.change(screen.getByLabelText("Move home Club to"), {
    target: { value: "plan-vi" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Preview location change" }));
}

describe("ClubLocationTransferPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue([sourceEnrollment]);
    mocks.plans.mockResolvedValue([targetPlan]);
    mocks.pods.mockResolvedValue([]);
  });

  it("previews and executes a transition-per-session home Club move", async () => {
    mocks.post
      .mockResolvedValueOnce(transitionPreview)
      .mockResolvedValueOnce({
        ...transitionPreview,
        transfer_id: "transfer-1",
        target_enrollment_id: "enrollment-vi",
      });

    render(<ClubLocationTransferPanel memberId="member-ay" />);
    await chooseTarget();

    expect(await screen.findByText(/No second quarter fee is collected/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm permanent location change" })
    );

    await screen.findByText(
      "Home Club changed from SwimBuddz Yaba to SwimBuddz VI."
    );
    expect(mocks.post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/clubs/admin/enrollments/enrollment-yaba/location-transfer/preview",
      { target_plan_version_id: "plan-vi" },
      { auth: true }
    );
    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/clubs/admin/enrollments/enrollment-yaba/location-transfer",
      { target_plan_version_id: "plan-vi" },
      { auth: true }
    );
  });

  it("shows the value comparison but does not offer execution for a prepaid quarter", async () => {
    mocks.get.mockResolvedValue([
      { ...sourceEnrollment, payment_mode: "quarterly_prepaid" },
    ]);
    mocks.post.mockResolvedValue({
      ...transitionPreview,
      payment_mode: "quarterly_prepaid",
      source_remaining_sessions: 10,
      source_remaining_value_kobo: 5200000,
      target_remaining_sessions: 10,
      target_remaining_value_kobo: 12000000,
      estimated_difference_kobo: 6800000,
      can_execute_now: false,
      requires_financial_reconciliation: true,
      guidance:
        "This member prepaid a quarter. Reconcile the remaining-value difference before granting a replacement prepaid quarter.",
    });

    render(<ClubLocationTransferPanel memberId="member-ay" />);
    await chooseTarget();

    await screen.findByText(/Reconcile the remaining-value difference/);
    expect(screen.getByText(/Source remaining:/)).toHaveTextContent("10 swims");
    expect(screen.getByText(/Target remaining:/)).toHaveTextContent("10 swims");
    expect(screen.getByText(/Estimated value difference:/)).toHaveTextContent("₦68,000");
    expect(
      screen.queryByRole("button", { name: "Confirm permanent location change" })
    ).not.toBeInTheDocument();
  });
});
