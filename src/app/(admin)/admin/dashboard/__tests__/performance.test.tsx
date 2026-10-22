import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "../page";

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.apiGet }));

describe("admin dashboard critical path", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders stats while every optional panel is still pending", async () => {
    mocks.apiGet.mockImplementation((path: string) =>
      path === "/api/v1/admin/dashboard-stats"
        ? Promise.resolve({ total_members: 123, approved_members: 100 })
        : new Promise(() => {}));
    render(<AdminDashboardPage />);
    expect(await screen.findByText("123")).toBeInTheDocument();
    expect(screen.queryByText("Loading dashboard...")).not.toBeInTheDocument();
    expect(screen.getByText("Loading enrollments…")).toBeInTheDocument();
    expect(screen.queryByText("No recent enrollments")).not.toBeInTheDocument();
    // Even Flywheel must start immediately, rather than waiting on the lists.
    expect(mocks.apiGet).toHaveBeenCalledWith(
      "/api/v1/admin/reports/flywheel/overview", expect.objectContaining({ auth: true }));
  });

  it("preserves visible stats when optional services fail", async () => {
    mocks.apiGet.mockImplementation((path: string) =>
      path === "/api/v1/admin/dashboard-stats"
        ? Promise.resolve({ total_members: 123 })
        : Promise.reject(new Error("optional service unavailable")));
    render(<AdminDashboardPage />);
    expect(await screen.findByText("123")).toBeInTheDocument();
  });

  it("shows a failure when the critical stats request fails", async () => {
    mocks.apiGet.mockRejectedValue(new Error("Stats unavailable"));
    render(<AdminDashboardPage />);
    expect(await screen.findByText(/unavailable|Failed to load dashboard data/)).toBeInTheDocument();
  });
});
