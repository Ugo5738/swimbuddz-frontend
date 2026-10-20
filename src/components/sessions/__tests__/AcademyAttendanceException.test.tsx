import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AcademyAttendanceException } from "../AcademyAttendanceException";
import { SessionCard } from "../SessionCard";
import { SessionStatus, SessionType } from "@/lib/sessions";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api", () => ({ apiPost: post }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe("Student Academy exceptions without booking", () => {
  it("shows the controls on an enrolled student's included class card without a booking", () => {
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    render(<SessionCard session={{ id: "class-id", title: "Week 8", starts_at: "2026-10-23T13:00:00Z",
      ends_at: "2026-10-23T14:00:00Z", session_type: SessionType.COHORT_CLASS,
      status: SessionStatus.SCHEDULED, cohort_id: "own-cohort", cohort_fee_mode: "included",
      capacity: 10, pool_fee: 0, ride_share_fee: 0, is_recurring_instance: false,
      created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z" }} isBooked={false} membership="academy"
      cohortInfo={{ cohortName: "My Academy", programName: "Freestyle", isEnrolled: true }} />);
    expect(screen.getByText("Update my Academy attendance")).toBeInTheDocument();
  });
  it("records an own-class absence without sending a booking or member identity", async () => {
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    post.mockResolvedValue({ status: "excused" });
    render(<AcademyAttendanceException sessionId="class-id" startsAt="2026-10-23T13:00:00Z" />);
    fireEvent.change(screen.getByLabelText("My attendance"), { target: { value: "absence" } });
    fireEvent.click(screen.getByRole("button", { name: "Save attendance update" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith(
      "/api/v1/attendance/sessions/class-id/my-academy-attendance",
      { status: "excused", notes: null }, { auth: true }
    ));
    expect(await screen.findByRole("status")).toHaveTextContent("saved for your coach");
  });
  it("records short-notice absence without promising excused attendance", async () => {
    vi.setSystemTime(new Date("2026-10-23T12:00:00Z"));
    post.mockResolvedValue({ status: "absent" });
    render(<AcademyAttendanceException sessionId="class-id" startsAt="2026-10-23T13:00:00Z" />);
    fireEvent.change(screen.getByLabelText("My attendance"), { target: { value: "absence" } });
    fireEvent.click(screen.getByRole("button", { name: "Save attendance update" }));
    await waitFor(() => expect(post.mock.calls[0][1].status).toBe("absent"));
  });
  it("surfaces a coach-owned exception that the student cannot clear", async () => {
    post.mockRejectedValue(new Error("Ask your coach to restore Present"));
    render(<AcademyAttendanceException sessionId="class-id" startsAt="2026-10-23T13:00:00Z" attendanceStatus="absent" />);
    fireEvent.change(screen.getByLabelText("My attendance"), { target: { value: "present" } });
    fireEvent.click(screen.getByRole("button", { name: "Save attendance update" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ask your coach");
  });
});
