import { EnrollmentStatus } from "@/lib/academy";

interface EnrollmentStatusBadgeProps {
  status: EnrollmentStatus;
  className?: string;
}

export function EnrollmentStatusBadge({
  status,
  className = "",
}: EnrollmentStatusBadgeProps) {
  const styles = {
    [EnrollmentStatus.PENDING_APPROVAL]:
      "bg-amber-100 text-amber-700 border-amber-200",
    [EnrollmentStatus.ENROLLED]: "bg-green-100 text-green-700 border-green-200",
    [EnrollmentStatus.WAITLIST]:
      "bg-yellow-100 text-yellow-700 border-yellow-200",
    [EnrollmentStatus.DROPPED]: "bg-red-100 text-red-700 border-red-200",
    [EnrollmentStatus.GRADUATED]: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
