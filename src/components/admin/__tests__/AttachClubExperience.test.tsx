import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AttachClubExperience } from "../AttachClubExperience";
import type { ClubPlan, CommunityExperienceOffering } from "@/lib/clubOnboarding";

const put = vi.fn();
vi.mock("@/lib/api", () => ({ apiPut: (...args: unknown[]) => put(...args) }));
const plan = {
  id: "plan",
  name: "Q4 Club",
  period_start: "2026-10-01",
  period_end: "2026-12-31",
  currency: "NGN",
  published_at: "2026-09-09",
  community_experience_offering_id: null,
} as ClubPlan;
const offering = {
  id: "experience",
  name: "Year-End Experience",
  period_start: plan.period_start,
  period_end: plan.period_end,
  currency: "NGN",
  is_active: true,
} as CommunityExperienceOffering;

describe("optional Experience attachment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    put.mockResolvedValue(plan);
  });
  it("lets Admin explicitly link a matching offering to a published plan without repricing it", async () => {
    const saved = vi.fn();
    render(
      <AttachClubExperience
        plan={plan}
        offerings={[
          offering,
          { ...offering, id: "other", name: "Next quarter", period_start: "2027-01-01" },
        ]}
        onSaved={saved}
      />
    );
    expect(screen.queryByRole("option", { name: "Next quarter" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach optional Experience" })).toBeDisabled();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "experience" } });
    fireEvent.click(screen.getByRole("button", { name: "Attach optional Experience" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(put).toHaveBeenCalledWith(
      "/api/v1/clubs/admin/plans/plan/community-experience",
      { offering_id: "experience" },
      { auth: true }
    );
  });
  it("does not offer replacement for an already linked offering", () => {
    render(
      <AttachClubExperience
        plan={{ ...plan, community_experience_offering_id: "experience" }}
        offerings={[offering]}
        onSaved={vi.fn()}
      />
    );
    expect(screen.getByText(/Optional Experience: Year-End/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it("surfaces unavailable Event errors and does not claim success", async () => {
    const saved = vi.fn();
    put.mockRejectedValue(new Error("Event unavailable"));
    render(<AttachClubExperience plan={plan} offerings={[offering]} onSaved={saved} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "experience" } });
    fireEvent.click(screen.getByRole("button", { name: "Attach optional Experience" }));
    expect(await screen.findByText("Event unavailable")).toBeInTheDocument();
    expect(saved).not.toHaveBeenCalled();
  });
});
