import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClubCard } from "../ClubCard";
import { CommunityCard } from "../CommunityCard";
import { MembershipHistoryCard } from "../MembershipHistoryCard";

describe("membership renewal actions", () => {
  it("recognizes a prepaid upcoming Club period without asking the member to buy it again", () => {
    render(<ClubCard member={null} clubActive={false} communityActive history={{
      club_renewal_status: "upcoming", club_renewal_due_at: "2026-12-31T00:00:00Z", club_action: "renew",
      periods: [{ id: "future-club", product: "club", label: "Yaba Club", status: "upcoming",
        starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-12-31T00:00:00Z",
        source: "club_enrollment", dates_are_estimated: false, club_name: "Yaba Club", payment_mode: "quarterly_prepaid" }],
    }} />);
    expect(screen.getByText(/your next Club period is booked/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /renew or rejoin Club/i })).not.toBeInTheDocument();
  });
  it("offers early renewal to an active Community member", () => {
    render(
      <CommunityCard
        member={{
          membership: {
            community_paid_until: "2027-02-07T00:00:00Z",
            highest_paid_tier: "community",
          },
        }}
        communityActive
        communityFee={20_000}
      />
    );

    expect(screen.getByRole("link", { name: /renew community early/i })).toHaveAttribute(
      "href",
      "/checkout?purpose=community"
    );
  });

  it("does not upsell Community renewal while a higher tier is active", () => {
    render(
      <CommunityCard
        member={{ membership: { highest_paid_tier: "club" } }}
        communityActive
        communityFee={20_000}
      />
    );

    expect(screen.queryByRole("link", { name: /renew community early/i })).not.toBeInTheDocument();
  });

  it("lets a post-Academy Club member continue without losing bridge time", () => {
    render(
      <ClubCard
        member={{
          membership: {
            highest_paid_tier: "academy",
            post_academy_club_until: "2026-09-01T00:00:00Z",
            tier_statuses: {
              club: {
                tier: "club",
                status: "active",
                label: "Active",
                access_source: "post_academy",
                effective_until: "2026-09-01T00:00:00Z",
              },
            },
          },
        }}
        clubActive
        communityActive
      />
    );

    expect(screen.getByRole("link", { name: /continue with club/i })).toHaveAttribute(
      "href",
      "/upgrade/club/plan"
    );
    expect(screen.getByText(/complimentary post-Academy Club period/i)).toBeInTheDocument();
  });

  it("guides a former Club member to renew or rejoin", () => {
    render(
      <ClubCard
        member={{
          membership: {
            highest_paid_tier: "community",
            declared_tiers: ["community", "club"],
            club_paid_until: "2026-09-01T00:00:00Z",
          },
        }}
        clubActive={false}
        communityActive
        history={{
          periods: [],
          club_renewal_status: "due",
          club_renewal_due_at: "2026-09-01T00:00:00Z",
          club_action: "renew",
        }}
      />
    );

    expect(screen.getByText(/your club access ended/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /renew or rejoin club/i })).toHaveAttribute(
      "href",
      "/upgrade/club/plan"
    );
  });

  it("shows dated Membership and Club history with legacy estimates identified", () => {
    render(
      <MembershipHistoryCard
        history={{
          club_renewal_status: "due",
          club_renewal_due_at: "2026-07-20T00:00:00Z",
          club_action: "renew",
          periods: [
            {
              id: "community",
              product: "community",
              label: "Annual Membership",
              starts_at: "2026-02-19T00:00:00Z",
              ends_at: "2027-02-19T00:00:00Z",
              status: "active",
              source: "legacy_membership",
              dates_are_estimated: true,
              club_name: null,
              payment_mode: null,
            },
            {
              id: "club",
              product: "club",
              label: "Club",
              starts_at: "2026-04-20T00:00:00Z",
              ends_at: "2026-07-20T00:00:00Z",
              status: "expired",
              source: "legacy_membership",
              dates_are_estimated: true,
              club_name: null,
              payment_mode: null,
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Annual Membership")).toBeInTheDocument();
    expect(screen.getByText("Club")).toBeInTheDocument();
    expect(screen.getAllByText(/approximate legacy start/i)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /renew or rejoin club/i })).toHaveAttribute(
      "href",
      "/upgrade/club/plan"
    );
  });

  it.each(["community", "academy", undefined] as const)(
    "offers early Club renewal independently of the legacy paid tier (%s)",
    (highestPaidTier) => {
      render(<ClubCard member={{ membership: {
        highest_paid_tier: highestPaidTier,
        club_enrollment_until: "2026-12-31T00:00:00Z",
      } }} clubActive communityActive />);
      expect(screen.getByRole("link", { name: /renew club early/i })).toHaveAttribute(
        "href", "/upgrade/club/plan",
      );
    },
  );

  it("keeps readiness as the entry point for a new Club applicant", () => {
    render(<ClubCard member={null} clubActive={false} communityActive />);
    expect(screen.getByRole("link", { name: /upgrade to club/i })).toHaveAttribute(
      "href", "/upgrade/club/readiness",
    );
  });
});
