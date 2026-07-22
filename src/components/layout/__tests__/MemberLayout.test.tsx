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

  it("shows Pod Lead Tools for an active pod lead with effective Club access", async () => {
    listPodsILead.mockResolvedValue([{ id: "pod-1", status: "active" }]);

    render(
      <MemberLayout>
        <div>Page content</div>
      </MemberLayout>
    );

    await waitFor(() => expect(screen.getByText("Submission Review")).toBeInTheDocument());
  });
});
