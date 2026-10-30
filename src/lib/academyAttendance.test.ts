import { describe, expect, it } from "vitest";
import { academyAttendanceStatus } from "./academyAttendance";

describe("Academy attendance policy", () => {
  it("defaults an enrolled student in an included class to Present without a booking", () => {
    expect(academyAttendanceStatus({ feeMode: "included", hasConfirmedBooking: false })).toBe("present");
  });
  it.each(["absent", "excused", "late", "cancelled"])("preserves a coach/admin %s exception", status => {
    expect(academyAttendanceStatus({ recordedStatus: status, hasConfirmedBooking: true })).toBe(status);
  });
  it("defaults only the student with a confirmed extra booking to Present", () => {
    expect(academyAttendanceStatus({ feeMode: "paid_extra", hasConfirmedBooking: false })).toBe("absent");
    expect(academyAttendanceStatus({ feeMode: "paid_extra", hasConfirmedBooking: true })).toBe("present");
  });
  it.each([true, false])("defaults individual attendance only for the booked student (booked=%s)", hasConfirmedBooking => {
    expect(academyAttendanceStatus({ feeMode: "included", attendanceMode: "individual", hasConfirmedBooking })).toBe(hasConfirmedBooking ? "present" : "absent");
    expect(academyAttendanceStatus({ recordedStatus: "present", attendanceMode: "individual", hasConfirmedBooking })).toBe("present");
  });
  it("does not invent presence for an inactive enrolment or erase its saved exception", () => {
    expect(academyAttendanceStatus({ eligibleEnrollment: false, hasConfirmedBooking: false })).toBe("absent");
    expect(academyAttendanceStatus({ recordedStatus: "late", eligibleEnrollment: false, hasConfirmedBooking: false })).toBe("late");
  });
  it("does not default a class before the student joined to Present", () => {
    expect(academyAttendanceStatus({ joinedAt: "2026-10-07T09:00:00Z", sessionStartsAt: "2026-10-04T15:00:00Z", hasConfirmedBooking: false })).toBe("absent");
    expect(academyAttendanceStatus({ joinedAt: "2026-10-07T09:00:00Z", sessionStartsAt: "2026-10-11T15:00:00Z", hasConfirmedBooking: false })).toBe("present");
  });
});
