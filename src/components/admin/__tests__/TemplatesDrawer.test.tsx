import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesDrawer } from "../TemplatesDrawer";

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
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
  listPublicPods: vi.fn(async () => [
    {
      id: "pod-orca",
      club_id: "club-lagos",
      name: "Orca",
    },
  ]),
  podDisplayName: vi.fn(() => "Orca"),
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
  return onCreateTemplate;
}

describe("TemplatesDrawer Club scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      pod_id: null,
    });
  });

  it("submits a selected pod for a pod-specific Club template", async () => {
    const onCreate = renderCreateDrawer();

    fireEvent.click(screen.getByRole("radio", { name: "Pod-specific" }));
    const podSelect = await screen.findByLabelText(/^Pod/);
    fireEvent.change(podSelect, { target: { value: "pod-orca" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Template" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
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
