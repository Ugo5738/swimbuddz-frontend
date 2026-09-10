import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "../page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
  params: new URLSearchParams(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.params,
}));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get }));
vi.mock("next/dynamic", () => ({
  default: () =>
    function Qr({ value }: { value: string }) {
      return <canvas aria-label="Member QR" data-value={value} />;
    },
}));
vi.mock("@/components/profile/BadgesCard", () => ({ BadgesCard: () => null }));
vi.mock("@/components/profile/LaddersProgressCard", () => ({ LaddersProgressCard: () => null }));
vi.mock("@/components/profile/UpcomingSessions", () => ({ UpcomingSessions: () => null }));
vi.mock("@/components/account/ProfileEditForm", () => ({ ProfileEditForm: () => null }));

function member(communityUntil: string, clubUntil?: string) {
  return {
    id: "community-member-id",
    first_name: "Comfort",
    last_name: "Test",
    email: "comfort@example.com",
    created_at: "2025-01-01",
    is_active: true,
    membership: {
      effective_paid_tiers: communityUntil.startsWith("2099")
        ? clubUntil
          ? ["community", "club"]
          : ["community"]
        : [],
      community_paid_until: communityUntil,
      club_paid_until: clubUntil,
    },
  };
}

describe("Member identity QR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a Community-only member's card and identity QR with their Membership expiry", async () => {
    mocks.get.mockResolvedValue(member("2099-12-31"));
    render(<ProfilePage />);
    expect(await screen.findByText("View Member Card")).toHaveAttribute("href", "#membership-card");
    expect(screen.getByLabelText("Member QR")).toHaveAttribute(
      "data-value",
      expect.stringContaining("/verify/community-member-id")
    );
    expect(screen.getByText("Community Member")).toBeInTheDocument();
    expect(screen.getByText(/Valid until/)).toHaveTextContent("Dec 2099");
    expect(screen.getByText(/A swim still needs its own valid booking/)).toBeInTheDocument();
    expect(screen.queryByText("Club Member")).not.toBeInTheDocument();
  });

  it("keeps Club member QR cards available", async () => {
    mocks.get.mockResolvedValue(member("2099-12-31", "2099-11-30"));
    render(<ProfilePage />);
    expect(await screen.findByLabelText("Member QR")).toBeInTheDocument();
    expect(screen.getByText("Club Member")).toBeInTheDocument();
  });

  it("does not show an active Membership pass for an unpaid or expired member", async () => {
    mocks.get.mockResolvedValue(member("2020-12-31"));
    render(<ProfilePage />);
    await screen.findByRole("heading", { name: "Membership" });
    expect(screen.queryByLabelText("Member QR")).not.toBeInTheDocument();
    expect(screen.queryByText("View Member Card")).not.toBeInTheDocument();
  });
});
