import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClubPlansAdminPage from "../page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  create: vi.fn(),
  plans: [] as any[],
}));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post, apiPut: mocks.put }));
vi.mock("@/lib/clubOnboarding", () => ({ createClubPlan: mocks.create }));
vi.mock("@/hooks/useApi", () => ({
  useApi: (path: string) => ({
    loading: false,
    error: null,
    refetch: vi.fn(),
    data: path.includes("admin/plans")
      ? mocks.plans
      : path.includes("pools?")
        ? { items: [] }
        : path.includes("community-experiences")
          ? []
          : [{ id: "yaba", name: "Yaba Club" }],
  }),
}));

const plan = {
  id: "draft",
  club_id: "yaba",
  club_name: "Yaba Club",
  name: "Q4 Draft",
  club_fee_kobo: 1_200_000,
  recommended_fee_kobo: 1_200_000,
  published_at: null,
  session_ids: ["one", "two"],
  sessions_included: 2,
  period_start: "2026-10-01",
  period_end: "2026-12-31",
  minimum_entry_sessions: 1,
  capacity: null,
  effective_from: "2026-09-01",
  effective_to: null,
  refreshments_included: true,
  community_experience_default_selected: false,
  community_experience_offering_id: null,
};

describe("Admin actual-session quarter drafts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.plans = [plan];
    mocks.get.mockResolvedValue({
      suggested_experience_date: "2026-12-05",
      sessions: [
        {
          id: "one",
          title: "Mainland swim",
          starts_at: "2026-10-03T09:00:00Z",
          status: "draft",
          fee_kobo: 500_000,
          pricing: {
            mode: "cost_plus",
            cost_per_attendee_kobo: 350_000,
            margin_per_attendee_kobo: 150_000,
          },
        },
        {
          id: "two",
          title: "Island visit",
          starts_at: "2026-10-10T09:00:00Z",
          status: "scheduled",
          fee_kobo: 700_000,
          pricing: {
            mode: "cost_plus",
            cost_per_attendee_kobo: 500_000,
            margin_per_attendee_kobo: 200_000,
          },
        },
      ],
    });
    mocks.put.mockResolvedValue(plan);
    mocks.post.mockResolvedValue(plan);
    mocks.create.mockResolvedValue({ ...plan, session_ids: [] });
  });
  it("derives prices from actual selected sessions and saves without publishing", async () => {
    render(<ClubPlansAdminPage />);
    fireEvent.click(screen.getByRole("button", { name: "Review draft" }));
    expect(await screen.findByText(/recommended ₦12,000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /Island visit/ }));
    expect(screen.getByText(/1 included sessions · recommended ₦5,000/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() =>
      expect(mocks.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          session_ids: ["one"],
          sessions_included: 1,
          club_fee_kobo: null,
          is_active: false,
        }),
        { auth: true }
      )
    );
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("generates the next quarter as a reviewable draft, not an automatic publication", async () => {
    render(<ClubPlansAdminPage />);
    fireEvent.click(screen.getByRole("button", { name: "Generate next quarter" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/clubs/admin/plans/draft/next-quarter",
        {},
        { auth: true }
      )
    );
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
    expect(await screen.findByText(/2026-12-05/)).toBeInTheDocument();
  });
  it("requires explicit publish after the reviewed draft is saved", async () => {
    render(<ClubPlansAdminPage />);
    fireEvent.click(screen.getByRole("button", { name: "Review draft" }));
    await screen.findByText(/recommended ₦12,000/);
    fireEvent.click(screen.getByRole("button", { name: "Save and publish reviewed quarter" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/clubs/admin/plans/draft/publish",
        {},
        { auth: true }
      )
    );
    expect(mocks.put.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.post.mock.invocationCallOrder[0]
    );
  });
  it("generates an inaugural quarter without a source session or an existing plan", async () => {
    mocks.plans = [];
    render(<ClubPlansAdminPage />);
    fireEvent.change(screen.getByLabelText("Recommendation Club"), { target: { value: "yaba" } });
    fireEvent.change(screen.getByLabelText("Quarter"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Margin (₦)"), { target: { value: "1000" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate reviewable quarter" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/clubs/admin/plans/recommendations",
        expect.objectContaining({
          club_id: "yaba",
          quarter: 4,
          template_id: null,
          pricing_settings: expect.objectContaining({
            margin_value: 1000,
            pricing_expected_attendees: 20,
          }),
        }),
        { auth: true }
      )
    );
    expect(mocks.post.mock.calls[0][1]).not.toHaveProperty("source_session_id");
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
  });
});
