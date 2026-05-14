"use client";

import { Button } from "@/components/ui/Button";
import { AcademyApi, WithdrawEnrollmentResponse, WithdrawWindow } from "@/lib/academy";
import { X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface WithdrawEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: string;
  cohortName: string;
  programName?: string;
  onWithdrawn: (result: WithdrawEnrollmentResponse) => void;
}

function formatNairaFromKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

function windowLabel(window: WithdrawWindow): string {
  switch (window) {
    case "before_start":
      return "before the cohort starts";
    case "mid_entry_window":
      return "while the cohort is in its mid-entry window";
    case "after_cutoff":
      return "after the mid-entry cutoff has passed";
  }
}

export function WithdrawEnrollmentModal({
  isOpen,
  onClose,
  enrollmentId,
  cohortName,
  programName,
  onWithdrawn,
}: WithdrawEnrollmentModalProps) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error("Please confirm you understand the consequences");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await AcademyApi.withdrawEnrollment(enrollmentId, {
        reason: reason.trim() || undefined,
      });
      const refundLabel =
        result.refund_kobo > 0
          ? `${formatNairaFromKobo(result.refund_kobo)} refund recorded — admin will reach out to disburse.`
          : "No refund applies for this withdrawal window.";
      toast.success(`Withdrawn from cohort. ${refundLabel}`);
      onWithdrawn(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Withdrawal failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Withdraw from cohort
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {programName ? `${programName} — ` : ""}
              {cohortName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm text-slate-700 space-y-2">
            <p className="font-medium text-slate-900">What happens next</p>
            <ul className="space-y-1.5 text-xs leading-relaxed">
              <li>
                <span className="text-slate-500">•</span> Your remaining unpaid
                installments will be <strong>waived</strong>.
              </li>
              <li>
                <span className="text-slate-500">•</span> A refund (if any)
                follows our policy based on when you withdraw:
                <span className="block ml-3 mt-1 text-slate-500">
                  before start → 90% · in mid-entry window → 50% of unused ·
                  after cutoff → none
                </span>
              </li>
              <li>
                <span className="text-slate-500">•</span> Refunds are disbursed
                manually by our team — we&apos;ll reach out within a few days.
              </li>
              <li>
                <span className="text-slate-500">•</span> You keep your
                Community access. This action cannot be undone from the app.
              </li>
            </ul>
          </div>

          <div>
            <label
              htmlFor="withdraw-reason"
              className="text-xs font-medium text-slate-600 block mb-1"
            >
              Reason (optional)
            </label>
            <textarea
              id="withdraw-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Help us understand what didn't work — your honest answer helps us improve."
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-400"
            />
            <span className="text-xs text-slate-700">
              I understand my enrollment will end and the refund (if any) will
              be determined by the policy above.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 bg-slate-50 rounded-b-2xl">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!confirmed || isSubmitting}
            className="bg-slate-700 hover:bg-slate-800 text-white"
          >
            {isSubmitting ? "Withdrawing..." : "Withdraw from cohort"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Subtle inline trigger — a small grey text link, intentionally low-visibility. */
export function WithdrawLink({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-slate-400 hover:text-slate-600 hover:underline transition-colors"
    >
      Withdraw from this cohort
    </button>
  );
}
