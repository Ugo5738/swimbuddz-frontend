import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MySwimsPage from "../page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/swims/SwimRewards", () => ({
  SwimRewards: () => <div data-testid="swim-rewards-strip" />,
}));

vi.mock("@/components/swims/PersonalSwimCalendar", () => ({
  PersonalSwimCalendar: () => null,
  swimDay: (value: string | null | undefined) => (value ? value.slice(0, 10) : ""),
}));

vi.mock("@/hooks/usePersonalSwims", () => ({
  usePersonalSwims: () => ({
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    data: {
      errors: [],
      activities: [
        {
          key: "club:sess-1",
          kind: "club",
          title: "SwimBuddz Yaba Club practice",
          date: "2030-11-28T08:00:00Z",
          location: "Rowe Park Pool",
          status: "scheduled_for_club",
          sessionId: "sess-1",
          scheduledClub: true,
          canBook: true,
        },
      ],
      upcoming: [
        {
          key: "club:sess-1",
          kind: "club",
          title: "SwimBuddz Yaba Club practice",
          date: "2030-11-28T08:00:00Z",
          location: "Rowe Park Pool",
          status: "scheduled_for_club",
          sessionId: "sess-1",
          scheduledClub: true,
          canBook: true,
        },
      ],
      history: [],
      plans: [],
      attention: [],
    },
  }),
}));

describe("MySwimsPage mobile-first cards (ADR-024)", () => {
  it("renders non-wrapping Club status pills and clean stacked card actions", () => {
    render(<MySwimsPage />);

    const badges = screen.getAllByText("Scheduled for your Club", { selector: "span" });
    // Rendered once in the Next hero card and once in the Upcoming swims card
    expect(badges).toHaveLength(2);
    for (const badge of badges) {
      expect(badge.className).toContain("whitespace-nowrap");
      expect(badge.className).toContain("shrink-0");
    }

    // Both the hero card and the upcoming list card offer direct booking
    const bookLinks = screen.getAllByRole("link", { name: "Book this swim" });
    expect(bookLinks).toHaveLength(2);
    for (const link of bookLinks) {
      expect(link).toHaveAttribute("href", "/sessions/sess-1/book");
    }

    // Upcoming list card exposes Details alongside Book this swim
    expect(
      screen.getByRole("button", { name: "View SwimBuddz Yaba Club practice details" })
    ).toBeInTheDocument();
  });
});
