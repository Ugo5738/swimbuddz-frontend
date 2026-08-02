import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionFormModal } from "../SessionFormModal";

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
}));

vi.mock("@/components/admin/VolunteerNeedsDraftSection", () => ({
  VolunteerNeedsDraftSection: ({ onChange }: { onChange: (needs: unknown[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange([
          {
            role_id: "role-checkin",
            role_title: "Check-in",
            slots_needed: 1,
            opportunity_type: "open_claim",
            min_tier: "tier_1",
            title_override: "",
          },
        ])
      }
    >
      Add test volunteer need
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

function renderModal(onCreate = vi.fn()) {
  render(
    <SessionFormModal
      mode="create"
      rideAreas={[]}
      submitting={false}
      onClose={vi.fn()}
      onCreate={onCreate}
      onUpdate={vi.fn()}
    />
  );
  fireEvent.change(screen.getByLabelText(/Title/), {
    target: { value: "Saturday Club Swim" },
  });
  return onCreate;
}

describe("SessionFormModal Club scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a general Club session with no pod", async () => {
    const onCreate = renderModal();

    expect(screen.getByRole("radio", { name: "General Club" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      pod_id: null,
    });
  });

  it("requires and submits a pod for a pod-specific Club session", async () => {
    const onCreate = renderModal();

    fireEvent.click(screen.getByRole("radio", { name: "Pod-specific" }));
    const podSelect = await screen.findByLabelText(/Pod/);
    fireEvent.change(podSelect, { target: { value: "pod-orca" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0]).toMatchObject({
      session_type: "club",
      pod_id: "pod-orca",
    });
  });

  it("submits volunteer opportunities during regular session creation", async () => {
    const onCreate = renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Add test volunteer need" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Session" }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][2]).toEqual([
      expect.objectContaining({ role_id: "role-checkin", role_title: "Check-in" }),
    ]);
  });
});
