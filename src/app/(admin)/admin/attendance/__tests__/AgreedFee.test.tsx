import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import Page from "../page";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiGet: mocks.get, apiPost: mocks.post }));
vi.mock("@/lib/sessions", () => ({
  SessionsApi: { listAllSessions: async () => [{ id: "vi", title: "VI practice", starts_at: "2026-10-24T08:00:00Z", session_type: "club", pool_fee: 15000 }] },
  isPoolFeeRefunded: () => false, isRunningLate: () => false, isSelfExcused: () => false,
}));
vi.mock("@/components/guest-passes/GuestSessionAdminCard", () => ({ GuestSessionAdminCard: () => null }));
vi.mock("@/components/guest-passes/SessionSwimmerRoster", () => ({ SessionSwimmerRoster: () => null }));
vi.mock("../useClubSessionRoster", () => ({ useClubSessionRoster: () => ({ loading: false, error: null, members: [
  { member_id: "ay", name: "Ayodeji Esuruoso", email: "ay@example.com", access_source: "club_transition", fee_amount_kobo: 1000000 },
  { member_id: "normal", name: "Normal Member", email: "normal@example.com", access_source: "club_transition", fee_amount_kobo: null },
] }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue([]);
  mocks.post.mockResolvedValue({});
});

it("shows AY's agreed walk-in fee while preserving the public fee for another member", async () => {
  render(<Page />);
  await screen.findByText("Normal Member");
  const ay = (await screen.findByText("Ayodeji Esuruoso")).closest("tr")!;
  expect(within(ay).getByRole("button", { name: /Mark walk-in/ })).toHaveTextContent("₦10,000");
  const normal = (await screen.findByText("Normal Member")).closest("tr")!;
  expect(within(normal).getByRole("button", { name: /Mark walk-in/ })).toHaveTextContent("₦15,000");
  // The Club roster may render, unmount and render again while its session
  // and attendance data load. Wait for the complete participant interface,
  // then resolve the live button rather than clicking a detached DOM node.
  await screen.findByRole("heading", { name: "Record a participant" });
  await waitFor(() => expect(screen.getByLabelText("Session")).toHaveValue("vi"));
  const liveAy = screen.getByText("Ayodeji Esuruoso").closest("tr")!;
  const walkInButton = within(liveAy).getByRole("button", { name: /Mark walk-in/ });
  expect(walkInButton).toBeInTheDocument();
  expect(walkInButton).toBeEnabled();
  fireEvent.click(walkInButton);
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith(
    "/api/v1/sessions/vi/admin/walk-in", { member_id: "ay" }, { auth: true }
  ));
});

it("passes the agreed fee through to the add-walk-in member selector", async () => {
  render(<Page />);
  await screen.findByText("Ayodeji Esuruoso");
  // The unified participant panel exposes the member form directly for Club sessions.
  await screen.findByRole("heading", { name: "Record a participant" });
  fireEvent.change(screen.getByLabelText("Find member by name or email"), { target: { value: "Ayodeji" } });
  fireEvent.click(screen.getByRole("button", { name: "Search members" }));
  fireEvent.change(screen.getByLabelText("Member to record"), { target: { value: "ay" } });
  expect(screen.getByLabelText(/^Session fee owed for this swim/)).toHaveValue(10000);
});
