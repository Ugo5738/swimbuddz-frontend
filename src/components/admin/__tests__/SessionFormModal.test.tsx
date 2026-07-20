import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SessionFormModal } from "../SessionFormModal";

vi.mock("@/components/admin/PoolPicker", () => ({
  PoolPicker: () => <div data-testid="pool-picker" />,
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
});
