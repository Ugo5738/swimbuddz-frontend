export function canPayAcademyEnrollment(status: string | null | undefined): boolean {
  return status === "pending_approval" || status === "enrolled";
}
