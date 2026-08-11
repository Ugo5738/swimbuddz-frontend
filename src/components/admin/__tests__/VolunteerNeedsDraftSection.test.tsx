import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VolunteerNeedsDraftSection } from "../VolunteerNeedsDraftSection";

vi.mock("@/hooks/useApi", () => ({
  useApi: (path: string) => {
    if (path.includes("opportunity-templates")) {
      return {
        data: [
          {
            id: "template-checkin",
            title: "Early check-in desk",
            description: "Set up the desk and welcome swimmers.",
            role_id: "role-checkin",
            day_of_week: 5,
            start_time: "07:30:00",
            duration_minutes: 90,
            location_name: "Old template venue",
            slots_needed: 2,
            opportunity_type: "approval_required",
            min_tier: "tier_2",
            qr_checkin_enabled: true,
            cancellation_deadline_hours: 12,
            auto_generate: false,
            is_active: true,
            last_materialised_through: null,
            created_at: "2026-08-01T00:00:00Z",
            updated_at: "2026-08-01T00:00:00Z",
            role_title: "Check-in",
            role_category: "checkin",
          },
        ],
        error: null,
        loading: false,
        refetch: vi.fn(),
      };
    }
    return {
      data: [
        {
          id: "role-checkin",
          title: "Check-in",
          description: null,
          category: "checkin",
          required_skills: null,
          min_tier: "tier_1",
          icon: "👋",
          sort_order: 1,
          is_active: true,
          time_commitment: null,
          responsibilities: null,
          skills_needed: null,
          best_for: null,
          created_at: "2026-08-01T00:00:00Z",
          updated_at: "2026-08-01T00:00:00Z",
          active_volunteers_count: 0,
        },
      ],
      error: null,
      loading: false,
      refetch: vi.fn(),
    };
  },
}));

function renderSection(onChange = vi.fn()) {
  render(
    <VolunteerNeedsDraftSection
      needs={[]}
      onChange={onChange}
      description="Add volunteer support."
      defaultStartTime="09:00"
      defaultEndTime="12:00"
    />
  );
  return onChange;
}

describe("VolunteerNeedsDraftSection", () => {
  it("creates a fresh session-linked opportunity with operational details", () => {
    const onChange = renderSection();

    fireEvent.change(screen.getByLabelText(/^Role/), {
      target: { value: "role-checkin" },
    });
    fireEvent.change(screen.getByLabelText(/^Opportunity title/), {
      target: { value: "Welcome desk" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Arrive early and check the member list." },
    });
    fireEvent.change(screen.getByLabelText(/^Volunteer start time/), {
      target: { value: "08:30" },
    });
    fireEvent.click(screen.getByLabelText("Enable volunteer QR check-in"));
    fireEvent.click(screen.getByRole("button", { name: "Add volunteer opportunity" }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        source_template_id: null,
        role_id: "role-checkin",
        title_override: "Welcome desk",
        description: "Arrive early and check the member list.",
        start_time: "08:30",
        end_time: "12:00",
        qr_checkin_enabled: true,
      }),
    ]);
  });

  it("copies a saved volunteer template into an editable session opportunity", () => {
    const onChange = renderSection();

    fireEvent.change(screen.getByLabelText(/^Start from a volunteer template/), {
      target: { value: "template-checkin" },
    });

    expect(screen.getByLabelText(/^Opportunity title/)).toHaveValue("Early check-in desk");
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Set up the desk and welcome swimmers."
    );
    expect(screen.getByLabelText(/^Volunteer start time/)).toHaveValue("07:30");
    expect(screen.getByLabelText(/^Volunteer end time/)).toHaveValue("09:00");

    fireEvent.click(screen.getByRole("button", { name: "Add volunteer opportunity" }));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        source_template_id: "template-checkin",
        role_id: "role-checkin",
        slots_needed: 2,
        opportunity_type: "approval_required",
        min_tier: "tier_2",
        cancellation_deadline_hours: 12,
        qr_checkin_enabled: true,
      }),
    ]);
  });

  it("offers a direct route to create and manage volunteer templates", () => {
    renderSection();

    expect(screen.getByRole("link", { name: /Manage volunteer templates/ })).toHaveAttribute(
      "href",
      "/admin/community/volunteers?tab=templates"
    );
  });
});
