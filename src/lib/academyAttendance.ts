export type AcademyAttendanceStatus = "present" | "absent" | "late" | "excused" | "cancelled";

/** Existing coach/admin decisions override the default for included classes. */
export function academyAttendanceStatus({
  recordedStatus,
  feeMode,
  hasConfirmedBooking,
  eligibleEnrollment = true,
  joinedAt,
  sessionStartsAt,
}: {
  recordedStatus?: string;
  feeMode?: string | null;
  hasConfirmedBooking: boolean;
  eligibleEnrollment?: boolean;
  joinedAt?: string | null;
  sessionStartsAt?: string;
}): AcademyAttendanceStatus {
  const recorded = recordedStatus?.toLowerCase();
  if (recorded && ["present", "absent", "late", "excused", "cancelled"].includes(recorded)) {
    return recorded as AcademyAttendanceStatus;
  }
  const joinedBeforeClass = !joinedAt || !sessionStartsAt || new Date(joinedAt) <= new Date(sessionStartsAt);
  return (eligibleEnrollment && joinedBeforeClass && feeMode !== "paid_extra") || hasConfirmedBooking ? "present" : "absent";
}
