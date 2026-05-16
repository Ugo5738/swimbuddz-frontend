// InstallmentRow extracted from page.tsx during the file-size sweep.
// Pure props-driven.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { type EnrollmentInstallment, InstallmentStatus } from "@/lib/academy";

import { formatNaira } from "./utils";

export function InstallmentRow({
  installment,
  index,
  total,
  onOpenPayment,
}: {
  installment: EnrollmentInstallment;
  index: number;
  total: number;
  /** Opens the 3-action payment modal for this installment */
  onOpenPayment?: (installmentId: string) => void;
}) {
  const isPaid = installment.status === InstallmentStatus.PAID;
  const isMissed = installment.status === InstallmentStatus.MISSED;
  const isWaived = installment.status === InstallmentStatus.WAIVED;
  const isPending = installment.status === InstallmentStatus.PENDING;

  const dueDate = new Date(installment.due_at);
  const now = new Date();
  const isDueSoon =
    isPending &&
    dueDate > now &&
    dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000; // within 3 days
  const isOverdue = isPending && dueDate < now;

  let statusColor = "bg-slate-100 text-slate-600";
  let statusLabel = "Pending";
  let rowBg = "bg-white border-slate-200";

  if (isPaid) {
    statusColor = "bg-green-100 text-green-700";
    statusLabel = "✓ Paid";
    rowBg = "bg-green-50 border-green-200";
  } else if (isWaived) {
    statusColor = "bg-blue-100 text-blue-700";
    statusLabel = "Waived";
    rowBg = "bg-blue-50 border-blue-200";
  } else if (isMissed) {
    statusColor = "bg-red-100 text-red-700";
    statusLabel = "Missed";
    rowBg = "bg-red-50 border-red-200";
  } else if (isOverdue) {
    statusColor = "bg-orange-100 text-orange-700";
    statusLabel = "Overdue";
    rowBg = "bg-orange-50 border-orange-200";
  } else if (isDueSoon) {
    statusColor = "bg-amber-100 text-amber-700";
    statusLabel = "Due Soon";
    rowBg = "bg-amber-50 border-amber-200";
  }

  return (
    <div
      className={`flex items-center gap-4 rounded-lg border p-4 ${rowBg} transition-colors`}
    >
      {/* Installment number circle */}
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${isPaid
            ? "bg-green-500 text-white"
            : isMissed
              ? "bg-red-500 text-white"
              : isWaived
                ? "bg-blue-500 text-white"
                : isOverdue
                  ? "bg-orange-500 text-white"
                  : "bg-slate-200 text-slate-700"
          }`}
      >
        {isPaid ? "✓" : index + 1}
      </div>

      {/* Date */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">
            Installment {index + 1} of {total}
          </span>
          <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-slate-500">
          Due{" "}
          {dueDate.toLocaleDateString("en-NG", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {installment.paid_at && (
            <span className="ml-2 text-green-600">
              · Paid{" "}
              {new Date(installment.paid_at).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </p>
      </div>

      {/* Amount + Pay button */}
      <div className="text-right shrink-0 space-y-1">
        <div className="font-semibold text-slate-900">
          {formatNaira(installment.amount)}
        </div>
        {!isPaid && !isWaived && onOpenPayment && (
          <button
            onClick={() => onOpenPayment(installment.id)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border-2 border-cyan-400 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition-all hover:bg-cyan-100 hover:border-cyan-500 whitespace-nowrap"
          >
            💳 Pay Now
          </button>
        )}
      </div>
    </div>
  );
}
