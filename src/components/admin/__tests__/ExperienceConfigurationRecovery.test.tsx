import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExperienceConfigurationRecovery } from "../ExperienceConfigurationRecovery";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  refetch: vi.fn(),
  status: "needs_reconciliation",
}));
vi.mock("@/lib/api", () => ({ apiPost: mocks.post }));
vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    data: [
      {
        id: "op-one",
        status: mocks.status,
        error: "Event binding restoration requires retry",
        created_at: "2026-09-08T09:00:00Z",
      },
    ],
    refetch: mocks.refetch,
    error: null,
  }),
}));

describe("Experience configuration recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status = "needs_reconciliation";
  });
  it("exposes incomplete restoration and retries only the saved operation", async () => {
    mocks.post.mockResolvedValue({ status: "failed" });
    render(<ExperienceConfigurationRecovery offeringId="q4-trip" />);
    expect(screen.getByText("Event binding restoration requires retry")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore previous configuration" }));
    await waitFor(() =>
      expect(mocks.post).toHaveBeenCalledWith(
        "/api/v1/clubs/community-experiences/admin/q4-trip/operations/op-one/recover",
        {},
        { auth: true }
      )
    );
    expect(mocks.refetch).toHaveBeenCalled();
  });
  it("does not offer rollback for an applied configuration", () => {
    mocks.status = "applied";
    render(<ExperienceConfigurationRecovery offeringId="q4-trip" />);
    expect(
      screen.queryByRole("button", { name: "Restore previous configuration" })
    ).not.toBeInTheDocument();
  });
});
