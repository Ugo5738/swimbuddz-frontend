import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RescheduleClubPractice } from "../RescheduleClubPractice";

const mocks = vi.hoisted(() => ({ post: vi.fn(), refetch: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiPost: mocks.post }));
vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({ data: [], error: null, loading: false, refetch: mocks.refetch }),
}));

function completeForm() {
  fireEvent.change(screen.getByLabelText("New start (Lagos time)"), {
    target: { value: "2026-10-07T09:00" },
  });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Rain makeup" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Pool has confirmed the new time" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm reschedule" }));
}

describe("Club same-identity rescheduling", () => {
  beforeEach(() => vi.clearAllMocks());
  it("sends only time and reason, never a pool or paid-price replacement", async () => {
    mocks.post.mockResolvedValue({ notification_status: "sent" });
    const changed = vi.fn(async () => {});
    render(<RescheduleClubPractice sessionId="original-swim" onChanged={changed} />);
    completeForm();
    await waitFor(() => expect(changed).toHaveBeenCalledOnce());
    expect(mocks.post.mock.calls[0][0]).toBe(
      "/api/v1/sessions/club-operations/original-swim/reschedule"
    );
    expect(mocks.post.mock.calls[0][1]).toEqual({
      operation_id: expect.any(String),
      starts_at: "2026-10-07T09:00:00+01:00",
      reason: "Rain makeup",
      pool_time_confirmed: true,
    });
    expect(
      await screen.findByText("Rescheduled. Bookings and paid amounts are unchanged.")
    ).toBeInTheDocument();
  });
  it("reuses the exact operation after a timeout instead of creating another move", async () => {
    mocks.post
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce({ notification_status: "sent" });
    render(<RescheduleClubPractice sessionId="original-swim" onChanged={async () => {}} />);
    completeForm();
    await screen.findByText("Request timed out");
    fireEvent.click(screen.getByRole("button", { name: "Retry same reschedule / notifications" }));
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
    expect(mocks.post.mock.calls[1][1]).toEqual(mocks.post.mock.calls[0][1]);
  });
});
