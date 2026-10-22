import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberLayout } from "@/components/layout/MemberLayout";
import MemberDashboardPage from "../page";

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), listSessions: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.apiGet }));
vi.mock("@/lib/auth", () => ({ supabase: { auth: {
  getUser: vi.fn().mockResolvedValue({ data: { user: {} } }), signOut: vi.fn(),
} } }));
vi.mock("@/lib/pods", () => ({
  listPodsILead: vi.fn().mockResolvedValue([]), getMyPod: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/sessions", () => ({ SessionsApi: {
  listSessions: mocks.listSessions, getSession: vi.fn().mockResolvedValue({ access: {} }),
} }));
vi.mock("@/lib/reports", () => ({
  fetchYTDStats: vi.fn().mockResolvedValue(null),
  fetchQuarterlyReport: vi.fn().mockResolvedValue(null), quarterSlug: () => "q4-2026",
}));
vi.mock("@/components/notifications/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/dashboard/GreetingHero", () => ({
  GreetingHero: ({ firstName }: { firstName: string }) => <h2>Hello {firstName}</h2>,
}));
vi.mock("@/components/dashboard/SwimCalendar", () => ({ SwimCalendar: () => null }));
vi.mock("@/components/dashboard/NextSessionCard", () => ({ NextSessionCard: () => null }));
vi.mock("@/components/dashboard/YTDStatsOverview", () => ({ YTDStatsOverview: () => null }));
vi.mock("@/components/dashboard/MyPodCard", () => ({ MyPodCard: () => null }));
vi.mock("@/components/dashboard/QuickActions", () => ({ QuickActions: () => null }));

describe("member dashboard request budget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSessions.mockResolvedValue([]);
    mocks.apiGet.mockImplementation(async (path: string) =>
      path === "/api/v1/members/me" ? { id: "member-1", first_name: "Amara" } : []);
  });

  it("shares one profile request between the shell and dashboard", async () => {
    render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await screen.findByRole("heading", { name: "Hello Amara" });
    expect(mocks.apiGet.mock.calls.filter(([path]) => path === "/api/v1/members/me")).toHaveLength(1);
  });

  it("waits for attendance and skips discovery when an upcoming booking exists", async () => {
    let resolveAttendance!: (value: unknown) => void;
    const attendance = new Promise((resolve) => { resolveAttendance = resolve; });
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === "/api/v1/attendance/me") return attendance;
      return Promise.resolve(path === "/api/v1/members/me"
        ? { id: "member-1", first_name: "Amara" } : []);
    });
    render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await screen.findByRole("heading", { name: "Hello Amara" });
    expect(mocks.listSessions).not.toHaveBeenCalled();
    await act(async () => {
      resolveAttendance([{ session_id: "session-1", session_starts_at: "2099-01-01", status: "present" }]);
    });
    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledWith(
      "/api/v1/attendance/me", expect.anything()));
    expect(mocks.listSessions).not.toHaveBeenCalled();
  });

  it("still discovers sessions after attendance fails", async () => {
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === "/api/v1/attendance/me") return Promise.reject(new Error("offline"));
      return Promise.resolve(path === "/api/v1/members/me"
        ? { id: "member-1", first_name: "Amara" } : []);
    });
    render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await waitFor(() => expect(mocks.listSessions).toHaveBeenCalledTimes(1));
  });

  it("retries a failed shared profile request without showing false onboarding", async () => {
    let offline = true;
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === "/api/v1/members/me") {
        return offline ? Promise.reject(new Error("offline"))
          : Promise.resolve({ id: "member-1", first_name: "Amara" });
      }
      return Promise.resolve([]);
    });
    render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await screen.findByText("Could not load your profile. Please try again.");
    expect(screen.queryByRole("heading", { name: "Hello Member" })).not.toBeInTheDocument();
    offline = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByRole("heading", { name: "Hello Amara" });
    expect(mocks.apiGet.mock.calls.filter(([path]) => path === "/api/v1/members/me")).toHaveLength(2);
  });

  it("does not retain one member's profile after the shell unmounts", async () => {
    const view = render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await screen.findByRole("heading", { name: "Hello Amara" });
    view.unmount();
    mocks.apiGet.mockImplementation(async (path: string) =>
      path === "/api/v1/members/me" ? { id: "member-2", first_name: "Tunde" } : []);
    render(<MemberLayout><MemberDashboardPage /></MemberLayout>);
    await screen.findByRole("heading", { name: "Hello Tunde" });
    expect(screen.queryByRole("heading", { name: "Hello Amara" })).not.toBeInTheDocument();
  });
});
