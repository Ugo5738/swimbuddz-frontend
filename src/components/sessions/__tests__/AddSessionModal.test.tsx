import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SessionsApi } from "@/lib/sessions";
import { AddSessionModal } from "../AddSessionModal";

vi.mock("@/components/admin/PoolPicker", () => ({ PoolPicker: () => null }));
vi.mock("@/lib/sessions", () => ({
  SessionType: { COHORT_CLASS: "cohort_class" },
  SessionsApi: { createSession: vi.fn(async () => ({ id: "session-1" })) },
}));
beforeEach(() => {
  vi.clearAllMocks();
});

it.each(["included", "paid_extra"])(
  "creates an explicit %s class from the cohort page",
  async (mode) => {
    render(<AddSessionModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} cohortId="cohort-1" />);
    expect(screen.getByLabelText(/^Class payment/)).toHaveValue("included");
    fireEvent.change(screen.getByLabelText(/^Class payment/), { target: { value: mode } });
    fireEvent.change(
      screen.getByLabelText(mode === "included" ? /^Stored session rate/ : /^Extra class price/),
      { target: { value: "15000.50" } }
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Session" }));
    await waitFor(() =>
      expect(SessionsApi.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ cohort_id: "cohort-1", cohort_fee_mode: mode, pool_fee: 15000.5 })
      )
    );
  }
);
