import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { SessionParticipantManager } from "../SessionParticipantManager";

const mocks = vi.hoisted(() => ({
  onMember: vi.fn(),
  onGuest: vi.fn(),
  onAcademy: vi.fn(),
}));

vi.mock("@/components/admin/AcademySessionAllocations", () => ({
  AcademySessionAllocations: () => <div>Academy allocation form</div>,
}));
vi.mock("@/components/guest-passes/GuestSessionAdminCard", () => ({
  GuestSessionAdminCard: () => <div>Guest booking links</div>,
}));
vi.mock("@/components/admin/RecordSessionWalkIn", () => ({
  RecordSessionWalkIn: ({ mode, onRecord, onRecordGuest }: {
    mode: string;
    onRecord: (memberId: string, fee: number, note: string) => Promise<void>;
    onRecordGuest: (input: { full_name: string }) => Promise<void>;
  }) => (
    <div>
      <p>Walk-in mode: {mode}</p>
      <button type="button" onClick={() => void onRecord("student", 1500000, "Guest test")}>
        Choose existing Academy student
      </button>
      <button type="button" onClick={() => void onRecord("visitor", 1500000, "Guest visit")}>
        Choose visitor
      </button>
      <button type="button" onClick={() => void onRecordGuest({ full_name: "Walk-in guest" })}>
        Record unregistered guest
      </button>
    </div>
  ),
}));

const props = {
  sessionId: "session",
  isAcademy: true,
  sessionStarted: true,
  enrollments: [{ id: "enrollment", member_id: "student", status: "enrolled" }],
  memberNames: { student: "Academy learner" },
  defaultMemberFee: 15000,
  defaultGuestFee: 20000,
  disabled: false,
  onRecordAcademy: mocks.onAcademy,
  onRecordMember: mocks.onMember,
  onRecordGuest: mocks.onGuest,
};

beforeEach(() => { vi.clearAllMocks(); });

it("shows exactly one participant entry point with an Academy route", () => {
  render(<SessionParticipantManager {...props} />);
  expect(screen.getAllByRole("heading", { name: "Record a participant" })).toHaveLength(1);
  expect(screen.getByText("Academy allocation form")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Existing member/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Unregistered guest/ })).toBeTruthy();
});

it("blocks cohort students on the generic visitor route but allows real members", async () => {
  render(<SessionParticipantManager {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Existing member/ }));
  fireEvent.click(screen.getByRole("button", { name: "Choose existing Academy student" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/enrolled in the cohort/i);
  expect(mocks.onMember).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Choose visitor" }));
  await waitFor(() => expect(mocks.onMember).toHaveBeenCalledWith("visitor", 1500000, "Guest visit", undefined));
});

it("keeps unregistered guest booking route available on Academy sessions", async () => {
  render(<SessionParticipantManager {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Unregistered guest/ }));
  expect(screen.getByText("Walk-in mode: guest")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Record unregistered guest" }));
  await waitFor(() => expect(mocks.onGuest).toHaveBeenCalledWith({ full_name: "Walk-in guest" }));
});

it("preserves member and guest paths on Community sessions without Academy", () => {
  render(<SessionParticipantManager {...props} isAcademy={false} enrollments={[]} />);
  expect(screen.queryByRole("button", { name: /^Academy student/ })).toBeNull();
  expect(screen.getByText("Walk-in mode: member")).toBeTruthy();
});
