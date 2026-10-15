import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminEventsPage from "../page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  scrollIntoView: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiGet: mocks.get,
  apiPatch: mocks.patch,
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));
vi.mock("@/components/admin/PoolPicker", () => ({ PoolPicker: () => null }));
vi.mock("@/components/guest-passes/GuestSessionAdminCard", () => ({
  GuestSessionAdminCard: () => <div>Guest booking link</div>,
}));

const event = {
  id: "november-community-swim",
  title: "Monthly SwimBuddz Community Swim",
  description: "A relaxed monthly swim.",
  event_type: "community_swim",
  primary_audience: "community",
  audiences: ["community", "club", "academy"],
  visibility: "public",
  status: "draft",
  location_type: "physical",
  timezone: "Africa/Lagos",
  location_area: "Victoria Island",
  is_location_private: true,
  location: "Oduduwa House Pool",
  pool_id: "oduduwa",
  start_time: "2026-11-07T10:00:00Z",
  end_time: "2026-11-07T13:00:00Z",
  max_capacity: 200,
  tier_access: "public",
  cost_naira: null,
  pricing_mode: "free",
  email_reminder_hours: [72, 24],
  participation_mode: "session",
  linked_session_count: 1,
};

describe("Admin Event editor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = mocks.scrollIntoView;
    mocks.get.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/v1/events/")) return [event];
      if (path.startsWith("/api/v1/sessions/")) {
        return [{ id: "swim-session", event_id: event.id, status: "scheduled", capacity: 200 }];
      }
      throw new Error(`Unexpected request: ${path}`);
    });
    mocks.patch.mockResolvedValue({ ...event, status: "published" });
  });

  it("brings an existing Event into view and focuses its populated editor", async () => {
    render(<AdminEventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Edit ${event.title}` }));

    const title = screen.getByRole("textbox", { name: "Event title" });
    expect(title).toHaveValue(event.title);
    expect(title).toHaveFocus();
    expect(mocks.scrollIntoView).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: `Edit ${event.title}` })).not.toBeInTheDocument();
    expect(mocks.patch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Close event form" }));
    expect(screen.getByRole("button", { name: `Edit ${event.title}` })).toBeVisible();
  });

  it("publishes the existing draft while preserving its accepted capacity and times", async () => {
    render(<AdminEventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Edit ${event.title}` }));
    fireEvent.change(screen.getByRole("combobox", { name: "Publication status" }), {
      target: { value: "published" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mocks.patch).toHaveBeenCalledWith(
        `/api/v1/events/${event.id}`,
        expect.objectContaining({
          status: "published",
          max_capacity: 200,
          start_time: "2026-11-07T10:00:00.000Z",
          end_time: "2026-11-07T13:00:00.000Z",
          pool_id: "oduduwa",
          is_location_private: true,
          pricing_mode: "free",
        }),
        { auth: true }
      )
    );
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument());
  });

  it("keeps the populated form available when publication fails", async () => {
    mocks.patch.mockRejectedValue(new Error("Publication failed"));
    render(<AdminEventsPage />);
    fireEvent.click(await screen.findByRole("button", { name: `Edit ${event.title}` }));
    fireEvent.change(screen.getByRole("combobox", { name: "Publication status" }), {
      target: { value: "published" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.patch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled());
    expect(screen.getByRole("textbox", { name: "Event title" })).toHaveValue(event.title);
    expect(screen.getByRole("spinbutton", { name: "Maximum capacity" })).toHaveValue(200);
  });
});
