import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiGet } from "@/lib/api";
import { PoolPicker } from "../PoolPicker";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));

describe("PoolPicker", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockResolvedValue({
      items: [
        {
          id: "rowe-park",
          name: "Rowe Park Pool",
          partnership_status: "active_partner",
          location_area: "Yaba",
          operating_area_id: "yaba",
          address: "Rowe Park Sports Centre, Yaba",
          is_active: true,
        },
      ],
      total: 1,
    });
  });

  it("returns the canonical pool snapshot with the selected ID and name", async () => {
    const onChange = vi.fn();
    render(<PoolPicker value={null} onChange={onChange} label="Pool venue" />);

    await waitFor(() => expect(screen.getByRole("combobox")).not.toBeDisabled());
    fireEvent.focus(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Rowe Park Pool/i }));

    expect(onChange).toHaveBeenCalledWith(
      "rowe-park",
      "Rowe Park Pool",
      expect.objectContaining({
        location_area: "Yaba",
        operating_area_id: "yaba",
        address: "Rowe Park Sports Centre, Yaba",
      })
    );
  });
});
