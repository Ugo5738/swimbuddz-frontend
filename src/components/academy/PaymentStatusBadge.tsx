import { PaymentStatus } from "@/lib/academy";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({
  status,
  className = "",
}: PaymentStatusBadgeProps) {
  const styles = {
    [PaymentStatus.PAID]: "bg-green-100 text-green-700 border-green-200",
    [PaymentStatus.PENDING]: "bg-yellow-100 text-yellow-700 border-yellow-200",
    [PaymentStatus.FAILED]: "bg-red-100 text-red-700 border-red-200",
    [PaymentStatus.WAIVED]: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
