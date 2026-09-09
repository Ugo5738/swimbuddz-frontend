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
vi.mock("@/components/club/RescheduleClubPractice", () => ({ RescheduleClubPractice: () => null }));
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
    mocks.post.mockResolvedValueOnce({ ...plan, id: "new-draft" });
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
    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith("/api/v1/clubs/admin/plans/new-draft/schedule", {
        auth: true,
      })
    );
    expect(
      await screen.findByText(/2 included sessions · recommended ₦12,000/)
    ).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("populates an existing empty draft and opens that same draft for review", async () => {
    const empty = {
      ...plan,
      id: "saved-empty-draft",
      name: "Admin's Q4",
      session_ids: [],
      sessions_included: 0,
      club_fee_kobo: 0,
      recommended_fee_kobo: 0,
    };
    mocks.plans = [empty];
    mocks.post.mockResolvedValueOnce({ ...plan, id: empty.id, name: empty.name, capacity: 15 });
    render(<ClubPlansAdminPage />);
    fireEvent.change(screen.getByLabelText("Recommendation Club"), { target: { value: "yaba" } });
    fireEvent.change(screen.getByLabelText("Quarter"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Margin (₦)"), { target: { value: "1500" } });
    fireEvent.change(screen.getByLabelText("Capacity"), { target: { value: "15" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate reviewable quarter" }));
    expect(
      await screen.findByText(/2 included sessions · recommended ₦12,000/)
    ).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith(`/api/v1/clubs/admin/plans/${empty.id}/schedule`, {
      auth: true,
    });
    expect(screen.getByLabelText("Plan name")).toHaveValue(empty.name);
    expect(screen.getByLabelText("Plan capacity (optional)")).toHaveValue(15);
    expect(screen.getByRole("checkbox", { name: /Mainland swim/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save and publish reviewed quarter" })).toBeEnabled();
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it("shows a configured-draft conflict instead of treating changed settings as applied", async () => {
    mocks.post.mockRejectedValueOnce(
      new Error(
        "A draft already exists for this Club and quarter. Open the existing draft to edit it."
      )
    );
    render(<ClubPlansAdminPage />);
    fireEvent.change(screen.getByLabelText("Recommendation Club"), { target: { value: "yaba" } });
    fireEvent.change(screen.getByLabelText("Quarter"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Margin (₦)"), { target: { value: "1500" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate reviewable quarter" }));
    expect(await screen.findByText(/A draft already exists/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review draft" })).toBeInTheDocument();
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.post.mock.calls.some(([url]) => url.endsWith("/publish"))).toBe(false);
  });

  it("opens an already-published quarter read-only without regenerating or publishing it", async () => {
    const published = {
      ...plan,
      id: "published-plan",
      name: "Published Q4",
      published_at: "2026-09-09T09:00:00Z",
    };
    mocks.plans = [published];
    mocks.post.mockResolvedValueOnce(published);
    render(<ClubPlansAdminPage />);
    fireEvent.change(screen.getByLabelText("Recommendation Club"), { target: { value: "yaba" } });
    fireEvent.change(screen.getByLabelText("Quarter"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Margin (₦)"), { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate reviewable quarter" }));
    expect(await screen.findByText("Published schedule (read-only)")).toBeInTheDocument();
    expect(mocks.get).toHaveBeenCalledWith(`/api/v1/clubs/admin/plans/${published.id}/schedule`, {
      auth: true,
    });
    expect(screen.getByLabelText("Plan name")).toHaveValue(published.name);
    expect(screen.getByLabelText("Plan name")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save and publish reviewed quarter" })
    ).not.toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.put).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
