import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSessionVolunteerOpportunities,
  type VolunteerNeedDraft,
} from "../session-volunteers";
import { VolunteersApi } from "../volunteers";

vi.mock("../volunteers", () => ({
  VolunteersApi: {
    admin: {
      listOpportunities: vi.fn(async () => []),
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

    const result = await createSessionVolunteerOpportunities(
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
    expect(result).toEqual({ createdCount: 1, skippedCount: 0 });
  });

  it("does not add the same active session opportunity twice", async () => {
    vi.mocked(VolunteersApi.admin.listOpportunities).mockResolvedValueOnce([
      {
        id: "opportunity-1",
        title: "Check-in",
        description: null,
        role_id: "role-checkin",
        role_title: "Check-in",
        role_category: "checkin",
        date: "2026-08-15",
        start_time: "08:30:00",
        end_time: "10:00:00",
        session_id: "session-123",
        event_id: null,
        location_name: "Rowe Park",
        slots_needed: 1,
        slots_filled: 0,
        opportunity_type: "open_claim",
        status: "open",
        min_tier: "tier_1",
        cancellation_deadline_hours: 24,
        created_by: null,
        qr_checkin_enabled: false,
        qr_token: null,
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T00:00:00Z",
      },
    ]);

    const result = await createSessionVolunteerOpportunities(
      "session-123",
      {
        title: "Saturday Club Swim",
        starts_at: "2026-08-15T09:00:00+01:00",
        ends_at: "2026-08-15T12:00:00+01:00",
        location_name: "Rowe Park",
      },
      [
        {
          source_template_id: null,
          role_id: "role-checkin",
          role_title: "Check-in",
          slots_needed: 1,
          opportunity_type: "open_claim",
          min_tier: "tier_1",
          title_override: "",
          description: "",
          start_time: "08:30",
          end_time: "10:00",
          cancellation_deadline_hours: 24,
          qr_checkin_enabled: false,
        },
      ]
    );

    expect(VolunteersApi.admin.bulkCreateOpportunities).not.toHaveBeenCalled();
    expect(result).toEqual({ createdCount: 0, skippedCount: 1 });
  });
});
