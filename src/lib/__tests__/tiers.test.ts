import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMembershipDetail,
  getMembershipLabel,
  getPaidMembershipTier,
  getPaidMembershipTiers,
  getRequestedTiers,
  getTierDisplayName,
  getTierStatus,
  hasRequestedTier,
  hasTierContext,
  isTierActive,
  isTierPaid,
  sortTiersByPriority,
} from "../tiers";

describe("Tier Utilities", () => {
  describe("getRequestedTiers", () => {
    it("returns empty array for null member", () => {
      expect(getRequestedTiers(null)).toEqual([]);
    });

    it("returns normalized requested tier statuses", () => {
      const member = {
        membership: {
          tier_statuses: {
            club: { tier: "club" as const, status: "requested" as const, label: "Requested" },
            academy: {
              tier: "academy" as const,
              status: "payment_pending" as const,
              label: "Payment pending",
            },
          },
        },
      };
      expect(getRequestedTiers(member)).toEqual(["club", "academy"]);
    });
  });

  describe("hasRequestedTier", () => {
    it("returns true when tier is requested", () => {
      const member = {
        membership: {
          tier_statuses: {
            club: { tier: "club" as const, status: "requested" as const, label: "Requested" },
          },
        },
      };
      expect(hasRequestedTier(member, "club")).toBe(true);
    });

    it("returns false when tier is not requested", () => {
      const member = { membership: { requested_tiers: ["academy"] } };
      expect(hasRequestedTier(member, "club")).toBe(false);
    });
  });

  describe("isTierPaid", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns false for null member", () => {
      expect(isTierPaid(null, "community")).toBe(false);
    });

    it("returns true when payment is not expired", () => {
      const member = {
        membership: {
          tier_statuses: {
            community: {
              tier: "community" as const,
              status: "active" as const,
              label: "Active",
            },
          },
        },
      };
      expect(isTierPaid(member, "community")).toBe(true);
    });

    it("returns false when payment is expired", () => {
      const member = { membership: { club_paid_until: "2025-01-01" } };
      expect(isTierPaid(member, "club")).toBe(false);
    });

    it("returns false when never paid", () => {
      const member = { membership: { academy_paid_until: null } };
      expect(isTierPaid(member, "academy")).toBe(false);
    });
  });

  describe("isTierActive", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true when approved and paid", () => {
      const member = {
        membership: {
          active_tiers: ["club"],
          club_paid_until: "2025-12-31",
          tier_statuses: {
            club: { tier: "club" as const, status: "active" as const, label: "Active" },
          },
        },
      };
      expect(isTierActive(member, "club")).toBe(true);
    });

    it("returns false when approved but not paid", () => {
      const member = {
        membership: {
          active_tiers: ["club"],
          club_paid_until: "2025-01-01",
        },
      };
      expect(isTierActive(member, "club")).toBe(false);
    });
  });

  describe("getPaidMembershipTier", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns prospect when no entitlement is paid", () => {
      const member = {
        membership: {
          active_tiers: ["club"],
          club_paid_until: "2025-01-01",
        },
      };
      expect(getPaidMembershipTier(member)).toBe("prospect");
    });

    it("returns highest paid tier", () => {
      const member = {
        membership: {
          paid_tier: "academy",
          paid_tiers: ["academy", "club", "community"],
          active_tiers: ["academy", "club", "community"],
          academy_paid_until: "2025-12-31",
          club_paid_until: "2025-12-31",
          community_paid_until: "2025-12-31",
        },
      };
      expect(getPaidMembershipTier(member)).toBe("academy");
    });

    it("prefers backend paid_tier over local date inference", () => {
      const member = {
        membership: {
          paid_tier: "club",
          paid_tiers: ["club", "community"],
          community_paid_until: null,
          club_paid_until: null,
        },
      };
      expect(getPaidMembershipTier(member)).toBe("club");
      expect(getPaidMembershipTiers(member)).toEqual(["club", "community"]);
    });
  });

  describe("getTierDisplayName", () => {
    it("capitalizes tier name", () => {
      expect(getTierDisplayName("community")).toBe("Community");
      expect(getTierDisplayName("CLUB")).toBe("Club");
    });
  });

  describe("sortTiersByPriority", () => {
    it("sorts tiers with highest priority first", () => {
      expect(sortTiersByPriority(["community", "academy", "club"])).toEqual([
        "academy",
        "club",
        "community",
      ]);
    });
  });

  describe("getMembershipLabel", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns pending label for requested tier", () => {
      const member = {
        membership: {
          display_label: "Club (Pending)",
          paid_tier: "community",
          active_tiers: ["community"],
          requested_tiers: ["club"],
          community_paid_until: "2025-12-31",
          tier_statuses: {
            community: {
              tier: "community" as const,
              status: "active" as const,
              label: "Active",
            },
            club: { tier: "club" as const, status: "requested" as const, label: "Requested" },
          },
        },
      };
      expect(getMembershipLabel(member)).toBe("Club (Pending)");
    });

    it("returns member label for active tier", () => {
      const member = {
        membership: {
          display_label: "Club Member",
          paid_tier: "club",
          active_tiers: ["club"],
          club_paid_until: "2025-12-31",
        },
      };
      expect(getMembershipLabel(member)).toBe("Club Member");
    });

    it("returns prospect when declared tier is unpaid", () => {
      const member = {
        membership: {
          active_tiers: ["club"],
          club_paid_until: "2025-01-01",
        },
      };
      expect(getMembershipLabel(member)).toBe("Prospect");
    });

    it("prefers backend display_label", () => {
      const member = {
        membership: {
          display_label: "Club (Payment Pending)",
          paid_tier: "prospect",
        },
      };
      expect(getMembershipLabel(member)).toBe("Club (Payment Pending)");
    });
  });

  describe("getMembershipDetail", () => {
    it("returns only backend-provided lifecycle detail", () => {
      expect(
        getMembershipDetail({
          membership: {
            display_label: "Community Member",
            display_detail: "Club: Payment pending",
          },
        })
      ).toBe("Club: Payment pending");
      expect(getMembershipDetail({ membership: { requested_tiers: ["club"] } })).toBeNull();
    });
  });

  describe("backend tier status contract", () => {
    it("uses tier_statuses for active checks and context", () => {
      const member = {
        membership: {
          tier_statuses: {
            community: {
              tier: "community" as const,
              status: "active" as const,
              label: "Active",
              inherited: true,
              inherited_from: "club" as const,
            },
            club: {
              tier: "club" as const,
              status: "approved_unpaid" as const,
              label: "Approved, payment needed",
            },
          },
        },
      };

      expect(isTierPaid(member, "community")).toBe(true);
      expect(isTierPaid(member, "club")).toBe(false);
      expect(hasTierContext(member, "club")).toBe(true);
      expect(getTierStatus(member, "community")?.inherited_from).toBe("club");
    });

    it("treats requested and payment-pending statuses as requested tiers", () => {
      const member = {
        membership: {
          tier_statuses: {
            club: {
              tier: "club" as const,
              status: "payment_pending" as const,
              label: "Payment pending",
            },
            academy: {
              tier: "academy" as const,
              status: "requested" as const,
              label: "Requested",
            },
          },
        },
      };

      expect(getRequestedTiers(member)).toEqual(["club", "academy"]);
    });

    it("keeps an expired declared tier as profile context without making it active", () => {
      const member = {
        membership: {
          tier_statuses: {
            academy: {
              tier: "academy" as const,
              status: "expired" as const,
              label: "Expired",
              declared_active: true,
            },
          },
        },
      };

      expect(hasTierContext(member, "academy")).toBe(true);
      expect(isTierActive(member, "academy")).toBe(false);
    });
  });
});
