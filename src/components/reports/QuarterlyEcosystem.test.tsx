import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuarterlyEcosystem, type QuarterlyEcosystemData } from "./QuarterlyEcosystem";

const data: QuarterlyEcosystemData = {
  version: 1, computed_at: "2026-10-11T00:00:00Z", source: "live_preview",
  sections: {
    members: { available: true, metrics: { clubs_configured: 4, pods_configured: 5, pods_populated_at_end: 2, experience_checkins: 0 } },
    wallet: { available: false, metrics: {} },
  },
  highlights: [{ title: "Location-specific Club plans", description: "Dated plans and enrollments", status: "implemented" }],
  external_podcast_episodes: [{ episode_number: 1, title: "Adult swimming", url: "https://www.youtube.com/watch?v=example", original_release_at: null, verification: "user_reported" }],
};

describe("quarterly ecosystem report", () => {
  it("shows configured groups and distinguishes a confirmed zero from an unavailable source", () => {
    render(<QuarterlyEcosystem data={data} />);
    expect(screen.getByText("Configured Clubs").parentElement).toHaveTextContent("4");
    expect(screen.getByText("Configured pods").parentElement).toHaveTextContent("5");
    expect(screen.getByText("Populated pods at quarter-end").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Event check-ins").parentElement).toHaveTextContent("0");
    expect(screen.getByText("Reward Bubbles").parentElement).toHaveTextContent("Unknown");
    expect(screen.getByText(/Live preview/)).toBeInTheDocument();
  });

  it("includes feature highlights and marks an unconfirmed broadcast date", () => {
    render(<QuarterlyEcosystem data={data} />);
    expect(screen.getByText("What changed in the system")).toBeInTheDocument();
    expect(screen.getByText("Dated plans and enrollments")).toBeInTheDocument();
    expect(screen.getByText(/Original broadcast date pending/)).toBeInTheDocument();
  });

  it("does not fabricate missing legacy metrics", () => {
    render(<QuarterlyEcosystem data={null} />);
    expect(screen.getByText(/have not been collected/)).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
