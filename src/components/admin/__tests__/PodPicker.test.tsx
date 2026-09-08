import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { adminListPods } from "@/lib/pods";

import { PodPicker } from "../PodPicker";

vi.mock("@/lib/clubs", () => ({
  getClub: vi.fn(async () => ({
    id: "club-mainland",
    name: "Lagos Mainland Club",
    location: "Surulere",
  })),
}));

vi.mock("@/lib/pods", () => ({
  adminGetPod: vi.fn(),
  adminListPods: vi.fn(async () => [
    {
      id: "pod-dolphins-mainland",
      club_id: "club-mainland",
      name: "Dolphins",
      slug: "dolphins",
      handle: null,
      active_member_count: 4,
      max_size: 5,
    },
  ]),
  podDisplayName: vi.fn((pod: { name: string }) => pod.name),
}));

describe("PodPicker", () => {
  it("loads only the selected Club's Pods and keeps Club context in each option", async () => {
    const onChange = vi.fn();

    render(<PodPicker clubId="club-mainland" value={null} onChange={onChange} required />);

    const picker = screen.getByRole("combobox", { name: /Pod/ });
    await waitFor(() => expect(picker).not.toBeDisabled());
    expect(adminListPods).toHaveBeenCalledWith({
      clubId: "club-mainland",
      status: "active",
    });

    fireEvent.focus(picker);
    fireEvent.click(
      await screen.findByRole("option", {
        name: "Dolphins, Lagos Mainland Club · Surulere",
      })
    );

    expect(onChange).toHaveBeenCalledWith(
      "pod-dolphins-mainland",
      expect.objectContaining({
        club_id: "club-mainland",
        name: "Dolphins",
      })
    );
  });
});
