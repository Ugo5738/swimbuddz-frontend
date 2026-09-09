import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesDrawer } from "../TemplatesDrawer";

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
  getPoolOption: vi.fn(async () => ({ id: "pool-rowe", name: "Rowe Park Pool" })),
}));

vi.mock("@/components/admin/ClubSessionScopeFields", () => ({
  ClubSessionScopeFields: ({
    scope,
    onClubChange,
    onScopeChange,
    onPodChange,
  }: {
    scope: "general" | "pod";
    onClubChange: (id: string, club: unknown) => void;
    onScopeChange: (scope: "general" | "pod") => void;
    onPodChange: (id: string, pod: unknown) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onClubChange("club-lagos", {
            id: "club-lagos",
            name: "Lagos Mainland Club",
            default_pool_id: "pool-rowe",
          })
        }
      >
        Select Lagos Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "general"}
        onClick={() => onScopeChange("general")}
      >
        General Club
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={scope === "pod"}
        onClick={() => onScopeChange("pod")}
      >
        Pod-specific
      </button>
      {scope === "pod" && (
        <button
          type="button"
          onClick={() =>
            onPodChange("pod-orca", {
              id: "pod-orca",
              club_id: "club-lagos",
              name: "Orca",
              default_pool_id: "pool-rowe",
            })
          }
        >
          Select Orca pod
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/admin/SessionTemplateVolunteerSlotsSection", () => ({
  SessionTemplateVolunteerSlotsSection: () => null,
}));

vi.mock("@/components/admin/VolunteerNeedsDraftSection", () => ({
  VolunteerNeedsDraftSection: ({ onChange }: { onChange: (needs: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          {
            role_id: "role-safety",
            role_title: "Safety",
            slots_needed: 2,
            opportunity_type: "approval_required",
            min_tier: "tier_2",
            title_override: "Safety lead",
          },
        ])
      }
    >
      Add test template need
    </button>
  ),
}));

vi.mock("@/lib/pods", () => ({
  adminGetPod: vi.fn(),
}));

function renderCreateDrawer(onCreateTemplate = vi.fn()) {
  render(
    <TemplatesDrawer
      templates={[]}
      rideAreas={[]}
      templateForm="create"
      editingTemplate={null}
      onClose={vi.fn()}
      onCreateTemplate={onCreateTemplate}
      onUpdateTemplate={vi.fn()}
      onDeleteTemplate={vi.fn()}
      onGenerate={vi.fn()}
      onOpenForm={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: "Saturday Club Swim" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Select Lagos Club" }));
  return onCreateTemplate;
}

describe("TemplatesDrawer Club scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves inherited pricing inputs with the selected Club, not a fixed template fee", async () => {
    const onCreate = renderCreateDrawer();
    await screen.findByLabelText(/^Expected attendees/);
    expect(screen.getByLabelText("Pool Fee (N)")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Club access mode"), {
      target: { value: "active_club" },
    });
    fireEvent.change(screen.getByLabelText(/^Expected attendees/), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Margin basis"), { target: { value: "percentage" } });
    fireEvent.change(screen.getByLabelText(/^Margin value/), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledOnce());
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      club_id: "club-lagos",
      club_access_mode: "active_club",
      pricing_settings: {
        pricing_expected_attendees: 15,
        margin_type: "percentage",
        margin_value: 25,
      },
    });
  });

  it("creates a general Club template with no pod", async () => {
    const onCreate = renderCreateDrawer();

    expect(screen.getByRole("radio", { name: "General Club" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.queryByLabelText(/^Pod/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: null,
    });
  });

  it("submits a selected pod for a pod-specific Club template", async () => {
    const onCreate = renderCreateDrawer();

    fireEvent.click(screen.getByRole("radio", { name: "Pod-specific" }));
    fireEvent.click(screen.getByRole("button", { name: "Select Orca pod" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      club_id: "club-lagos",
      pod_id: "pod-orca",
    });
  });

  it("submits volunteer needs with a new template", async () => {
    const onCreate = renderCreateDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Add test template need" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][1]).toEqual([
      expect.objectContaining({ role_id: "role-safety", slots_needed: 2 }),
    ]);
  });
});
