import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { apiGet } from "@/lib/api";
import { RecordSessionWalkIn } from "../RecordSessionWalkIn";

vi.mock("@/lib/api", () => ({ apiGet: vi.fn() }));
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

it("finds a registered member outside the roster and records attendance, not a payment", async () => {
  vi.mocked(apiGet).mockResolvedValue([
    { id: "member-1", first_name: "Ada", last_name: "Example", email: "ada@example.com" },
  ]);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const record = vi.fn(async () => {});
  render(<RecordSessionWalkIn defaultFee={5200} disabled={false} onRecord={record} />);
  fireEvent.click(screen.getByText("Record attendance for a member not on this roster"));
  expect(screen.getByRole("button", { name: "Record attended swim" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Find member by name or email"), {
    target: { value: "Ada" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Search members" }));
  await screen.findByRole("option", { name: "Ada Example — ada@example.com" });
  fireEvent.change(screen.getByLabelText("Member to record"), { target: { value: "member-1" } });
  fireEvent.change(screen.getByLabelText(/^Attendance reconciliation note/), {
    target: { value: "Verified actual Saturday attendance" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Record attended swim" }));
  await waitFor(() =>
    expect(record).toHaveBeenCalledWith("member-1", 520000, "Verified actual Saturday attendance")
  );
  expect(window.confirm).toHaveBeenCalledWith(
    expect.stringContaining("No payment will be collected")
  );
  expect(apiGet).toHaveBeenCalledWith(
    "/api/v1/members/?search=Ada&limit=20",
    expect.objectContaining({ auth: true })
  );
  fireEvent.change(screen.getByLabelText("Find member by name or email"), {
    target: { value: "Different member" },
  });
  expect(screen.queryByLabelText("Member to record")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Record attended swim" })).toBeDisabled();
});
