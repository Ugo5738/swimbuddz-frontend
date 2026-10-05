import { describe, expect, it } from "vitest";

import type { Member } from "../types";
import {
  hasActiveClub,
  hasProgrammeRequest,
  membershipNeedsAction,
  programmeLabel,
  statusTone,
} from "../utils";

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "member-1",
    email: "member@example.com",
    first_name: "Test",
    last_name: "Member",
    approval_status: "approved",
    registration_complete: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Member;
}

describe("admin member status helpers", () => {
  it("treats annual Membership independently from programmes", () => {
    const value = member({
      annual_membership_status: "expired",
      club_programme_status: "active",
      current_club_id: "club-1",
    });

    expect(membershipNeedsAction(value)).toBe(true);
    expect(hasActiveClub(value)).toBe(true);
  });

  it("surfaces programme requests without a tier hierarchy", () => {
    const value = member({ pending_programmes: ["club", "academy"] });

    expect(hasProgrammeRequest(value)).toBe(true);
    expect(programmeLabel("club")).toBe("Club");
    expect(programmeLabel("academy")).toBe("Academy");
  });

  it("maps normalized statuses to presentation tones", () => {
    expect(statusTone("active")).toBe("success");
    expect(statusTone("requested")).toBe("warning");
    expect(statusTone("payment_pending")).toBe("warning");
    expect(statusTone("expired")).toBe("danger");
    expect(statusTone("inactive")).toBe("neutral");
  });
});
