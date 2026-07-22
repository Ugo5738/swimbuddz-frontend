import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClubCard } from "../ClubCard";
import { CommunityCard } from "../CommunityCard";

describe("membership renewal actions", () => {
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
            highest_paid_tier: "club",
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
});
