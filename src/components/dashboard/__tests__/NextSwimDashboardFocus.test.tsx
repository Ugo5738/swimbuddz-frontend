import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextSwimDashboardFocus } from "../NextSwimDashboardFocus";

const mocks = vi.hoisted(() => ({ usePersonalSwims: vi.fn(), apiGet: vi.fn() }));
vi.mock("@/hooks/usePersonalSwims", () => ({ usePersonalSwims: mocks.usePersonalSwims }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.apiGet }));

function show() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <NextSwimDashboardFocus />
    </QueryClientProvider>
  );
}
const at = "2099-01-01T11:00:00Z";
const club = {
  key: "club-scheduled:one", sessionId: "one", title: "Dolphin practice",
  status: "scheduled_for_pod", kind: "club", date: at,
  location: "Victoria Island", scheduledClub: true, canBook: true,
};
function projection(upcoming: unknown[], attention: unknown[] = []) {
  mocks.usePersonalSwims.mockReturnValue({
    data: { upcoming, attention, errors: [] }, isLoading: false,
  });
}

describe("Dashboard next-swim action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiGet.mockResolvedValue({
      primary: { id: "next", title: "Recommended swim", starts_at: at, access: { bookable: true } },
      alternatives: [], next_confirmed: null,
    });
  });

  it("offers booking for an unreserved home Club session, without claiming it is confirmed", () => {
    projection([club]);
    show();
    expect(screen.getByText("Next on your Club schedule")).toBeInTheDocument();
    expect(screen.getByText(/your place is not yet reserved/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book this swim/ })).toHaveAttribute("href", "/sessions/one/book");
    expect(screen.queryByRole("link", { name: "My Swims" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Other swims" })).not.toBeInTheDocument();
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });

  it("never offers checkout when the backend says the scheduled Club swim is not bookable", () => {
    projection([{ ...club, canBook: false }]);
    show();
    expect(screen.getByRole("link", { name: /View session details/ })).toHaveAttribute("href", "/sessions/one");
    expect(screen.queryByRole("link", { name: /Book this swim/ })).not.toBeInTheDocument();
  });

  it("shows an existing confirmed reservation instead of recommending another", () => {
    projection([{ ...club, status: "confirmed", scheduledClub: false }]);
    show();
    expect(screen.getByText("Your next swim")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View my swim/ })).toHaveAttribute("href", "/sessions/one");
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });

  it("uses the backend's eligible recommendation when personal schedule is empty", async () => {
    projection([]);
    show();
    await screen.findByText("Recommended swim");
    expect(mocks.apiGet).toHaveBeenCalledWith("/api/v1/sessions/me/next-swim", { auth: true });
    expect(screen.getByRole("link", { name: /Book my next swim/ })).toHaveAttribute(
      "href", "/sessions/next/book?source=next-swim"
    );
  });

  it("does not let a pending payment hide eligible new swims", async () => {
    projection([{ ...club, status: "pending_payment", scheduledClub: false }]);
    show();
    await screen.findByText("Recommended swim");
    expect(mocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it("does not fabricate a recommendation if no eligible backend swim exists", async () => {
    projection([]);
    mocks.apiGet.mockResolvedValue({ primary: null, alternatives: [], next_confirmed: null });
    show();
    await waitFor(() => expect(screen.getByRole("link", { name: /Find a swim/ })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /Book my next swim/ })).not.toBeInTheDocument();
  });
});
