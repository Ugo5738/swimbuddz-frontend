import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberLayout } from "../MemberLayout";

const apiGet = vi.fn();
const listPodsILead = vi.fn();

vi.mock("@/lib/api", () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
}));

vi.mock("@/lib/auth", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { app_metadata: { roles: [] } } } })),
      signOut: vi.fn(async () => undefined),
    },
  },
}));

vi.mock("@/lib/pods", () => ({
  listPodsILead: (...args: unknown[]) => listPodsILead(...args),
}));

vi.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => null,
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => {
    const { fill, priority, ...imageProps } = props;
    void fill;
    void priority;
    return <span role="img" aria-label={alt} />;
  },
}));

describe("MemberLayout desktop navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    listPodsILead.mockResolvedValue([]);
    apiGet.mockResolvedValue({
      id: "member-1",
      first_name: "Amara",
      last_name: "Emrey",
      membership: {
        primary_tier: "club",
        active_tiers: ["club", "community"],
        paid_tier: "club",
        paid_tiers: ["club", "community"],
        display_label: "Club Member",
      },
    });
  });

  it("collapses the member sidebar and remembers the preference", async () => {
    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    await screen.findAllByText("Amara Emrey");

    fireEvent.click(screen.getByRole("button", { name: "Collapse member navigation" }));

    expect(screen.getByRole("complementary")).toHaveClass("md:w-20");
    expect(screen.getByRole("button", { name: "Expand member navigation" })).toBeInTheDocument();
    expect(localStorage.getItem("swimbuddz-member-sidebar-collapsed")).toBe("true");
  });

  it("hides Academy make-ups from a Club-only member and links to the latest Stroke Lab", async () => {
    render(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>
    );
    await screen.findAllByText("Amara Emrey");
    expect(screen.queryByRole("link", { name: "Make-up Classes" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Progress & Media" }));
    expect(screen.getByRole("link", { name: "Stroke Lab" })).toHaveAttribute(
      "href",
      "https://analyzer.swimbuddz.com"
    );
  });

  it("retains make-ups for someone with both Club and Academy membership", async () => {
    apiGet.mockResolvedValue({
      id: "learner",
      membership: { paid_tiers: ["club", "academy"], academy_paid_until: "2099-01-01T00:00:00Z" },
    });
    render(
      <MemberLayout>
        <div>Content</div>
      </MemberLayout>
    );
    await screen.findByRole("button", { name: "My Academy" });
    fireEvent.click(screen.getByRole("button", { name: "My Academy" }));
    expect(await screen.findByRole("link", { name: "Make-up Classes" })).toHaveAttribute(
      "href",
      "/account/makeups"
    );
  });

  it("keeps the leaderboard reachable through Community", async () => {
    render(<MemberLayout><div>Content</div></MemberLayout>);
    expect(await screen.findByRole("link", { name: "Leaderboard" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^\/account\/reports\/q[1-4]-\d{4}\/leaderboard$/)
    );
  });

  it("allows an active sidebar section to collapse and expand", async () => {
    window.history.replaceState({}, "", "/account/bookings");
    render(<MemberLayout><div>Content</div></MemberLayout>);
    const toggle = await screen.findByRole("button", { name: "My Swims" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Upcoming, Calendar & History" })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    window.history.replaceState({}, "", "/");
  });

  it("restores a previously collapsed sidebar", async () => {
    localStorage.setItem("swimbuddz-member-sidebar-collapsed", "true");

    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledTimes(2));
    await screen.findAllByText("Amara Emrey");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Expand member navigation" })).toBeInTheDocument()
    );
    expect(screen.getByRole("complementary")).toHaveClass("md:w-20");
  });

  it("does not show Pod Lead Tools for a historical inactive pod", async () => {
    listPodsILead.mockResolvedValue([{ id: "pod-1", status: "inactive" }]);

    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await waitFor(() => expect(listPodsILead).toHaveBeenCalled());
    expect(screen.queryByText("Submission Review")).not.toBeInTheDocument();
  });

  it("links to notification settings from member navigation", async () => {
    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await screen.findByRole("button", { name: /My Account/i });
    fireEvent.click(screen.getByRole("button", { name: /My Account/i }));
    const link = screen.getByRole("link", { name: "Notification Preferences" });
    expect(link).toHaveAttribute("href", "/account/settings");
  });

  it("shows Pod Lead Tools for an active pod lead with effective Club access", async () => {
    listPodsILead.mockResolvedValue([{ id: "pod-1", status: "active" }]);

    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /Pod Lead Tools/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Pod Lead Tools/i }));
    expect(screen.getByRole("link", { name: "Submission Review" })).toBeInTheDocument();
  });
});
