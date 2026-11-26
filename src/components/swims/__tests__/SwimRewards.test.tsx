import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  getNextSwimRewardCue,
  SwimRewardCard,
  type SwimProgress,
} from "../SwimRewards";

const returningSwimmerZeroProgramme: SwimProgress = {
  total_swims: 0,
  active_weeks: 0,
  streak_weeks: 0,
  week_days: 0,
  weekly_limit: 3,
  today_counted: false,
  bubbles_earned: 0,
  bubbles_credited: 0,
  reward_value_naira: 0,
  programme_start_date: "2026-11-22",
  all_time_swims: 8,
  all_time_active_weeks: 6,
  all_time_best_streak: 4,
  all_time_current_streak: 1,
  all_time_available: true,
};

describe("SwimRewardCard variants (ADR-020)", () => {
  it("renders unified Wallet & Rewards card on dashboard with live balance and weekly progress", () => {
    render(
      <SwimRewardCard
        data={returningSwimmerZeroProgramme}
        variant="dashboard"
        walletBalance={{ balance: 147, available_balance: 147 }}
      />
    );

    expect(screen.getByText(/147 🫧/)).toBeInTheDocument();
    expect(screen.getByText(/₦14,700 value/)).toBeInTheDocument();
    expect(screen.getByText("0 of 3 days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View reward details/i })).toHaveAttribute(
      "href",
      "/account/wallet/rewards"
    );
  });

  it("renders a slim collapsible strip on My Swims that keeps swims above the fold", () => {
    render(<SwimRewardCard data={returningSwimmerZeroProgramme} variant="strip" />);

    expect(screen.getByText(/This week’s swim rewards:/i)).toBeInTheDocument();
    expect(screen.getByText(/8 all-time swims/i)).toBeInTheDocument();
    expect(screen.queryByText(/How it works/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Details/i }));
    expect(screen.getByText(/All-time attended swims/i)).toBeInTheDocument();
    expect(screen.getByText(/2 more swims to earn “10 swims”/i)).toBeInTheDocument();
    expect(screen.getByText(/^Swim Bubbles$/i)).toBeInTheDocument();
    expect(screen.queryByText(/since 22 Nov 2026/i)).not.toBeInTheDocument();
  });

  it("renders a clean evergreen Weekly Swim Bubbles card beside all-time milestones on the Rewards hub (ADR-024)", () => {
    render(<SwimRewardCard data={returningSwimmerZeroProgramme} variant="hub" />);

    expect(screen.getByText(/Weekly Swim Bubbles/i)).toBeInTheDocument();
    expect(screen.getByText(/Milestones & Badges/i)).toBeInTheDocument();
    // Returning member with 8 attended swims already has "First swim" and needs 2 more for "10 swims"
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("4w")).toBeInTheDocument();
    expect(screen.getByText(/2 more swims to earn “10 swims”/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 more swim to earn the “First swim”/i)).not.toBeInTheDocument();
    // Keeps a single concise rule line and drops launch-date / redundant header tags
    expect(screen.getByText(/1 🫧 \(₦100\) per eligible swim day/i)).toBeInTheDocument();
    expect(screen.queryByText(/Swim Bubbles Programme/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Automatic · ₦100/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/22 Nov 2026/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/After your next eligible swim ends, you earn 1 Bubble automatically/i)
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Attendance exceptions/i)).not.toBeInTheDocument();
  });

  it("computes accurate inline next-swim reward cues", () => {
    expect(getNextSwimRewardCue(returningSwimmerZeroProgramme)).toBe(
      "+1 🫧 automatically after swim"
    );
    expect(
      getNextSwimRewardCue({ ...returningSwimmerZeroProgramme, week_days: 2 })
    ).toBe("+1 🫧 after swim (3 of 3 this week)");
    expect(
      getNextSwimRewardCue({ ...returningSwimmerZeroProgramme, week_days: 3 })
    ).toBe("Weekly 3-day Bubble cap reached");
    expect(
      getNextSwimRewardCue({ ...returningSwimmerZeroProgramme, today_counted: true })
    ).toContain("Today’s swim counted");
  });
});
