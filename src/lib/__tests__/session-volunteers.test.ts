import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSessionVolunteerOpportunities,
  type VolunteerNeedDraft,
} from "../session-volunteers";
import { VolunteersApi } from "../volunteers";

vi.mock("../volunteers", () => ({
  VolunteersApi: {
    admin: {
      bulkCreateOpportunities: vi.fn(async () => []),
    },
  },
}));

describe("createSessionVolunteerOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates normal volunteer records with the new session id", async () => {
    const need: VolunteerNeedDraft = {
      source_template_id: "template-checkin",
      role_id: "role-checkin",
      role_title: "Check-in",
      slots_needed: 2,
      opportunity_type: "approval_required",
      min_tier: "tier_2",
      title_override: "Welcome desk",
      description: "Check members in at the entrance.",
      start_time: "08:30",
      end_time: "10:00",
      cancellation_deadline_hours: 12,
      qr_checkin_enabled: true,
    };

    await createSessionVolunteerOpportunities(
      "session-123",
      {
        title: "Saturday Club Swim",
        starts_at: "2026-08-15T09:00:00+01:00",
        ends_at: "2026-08-15T12:00:00+01:00",
        location_name: "Rowe Park",
      },
      [need]
    );

    expect(VolunteersApi.admin.bulkCreateOpportunities).toHaveBeenCalledWith([
      expect.objectContaining({
        title: "Welcome desk",
        description: "Check members in at the entrance.",
        role_id: "role-checkin",
        date: "2026-08-15",
        start_time: "08:30",
        end_time: "10:00",
        session_id: "session-123",
        location_name: "Rowe Park",
        status: "open",
      }),
    ]);
  });
});
