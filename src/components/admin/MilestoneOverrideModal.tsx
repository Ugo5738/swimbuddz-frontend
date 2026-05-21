"use client";

/**
 * Admin override modal — flips a milestone claim's status with a
 * required reason. Records an OVERRIDE event server-side; the
 * original coach attribution on the live row is preserved (see
 * ACADEMY_ADMIN_CONTROLS_DESIGN §5.4).
 */

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import {
  AdminAcademyApi,
  type OverrideProgressRequest,
} from "@/lib/academy-admin";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  enrollmentId: string;
  milestoneId: string;
  milestoneName: string;
  currentStatus: "pending" | "achieved" | string;
  /** Called after a successful override so the parent can refresh. */
  onSuccess?: () => void;
};

export function MilestoneOverrideModal({
  isOpen,
  onClose,
  enrollmentId,
  milestoneId,
  milestoneName,
  currentStatus,
  onSuccess,
}: Props) {
  // Default the new status to the opposite of current — that's
  // overwhelmingly the intent of an admin opening this modal.
  const defaultNewStatus: "pending" | "achieved" =
    currentStatus === "achieved" ? "pending" : "achieved";

  const [newStatus, setNewStatus] = useState<"pending" | "achieved">(
    defaultNewStatus,
  );
  const [reason, setReason] = useState("");
  const [coachNotes, setCoachNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("A reason is required for any override.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: OverrideProgressRequest = {
        enrollment_id: enrollmentId,
        milestone_id: milestoneId,
        new_status: newStatus,
        override_reason: trimmed,
        coach_notes: coachNotes.trim() || null,
      };
      await AdminAcademyApi.overrideProgress(payload);
      toast.success(
        `Override recorded — claim is now ${newStatus === "achieved" ? "approved" : "pending"}.`,
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to record override.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={`Override review — ${milestoneName}`}
    >
      <p className="text-sm text-slate-600">
        Overriding records a new decision in the audit trail. The original
        coach's review stays attributed to the claim; this becomes an
        additional event on top.
      </p>

      <div>
        <label
          htmlFor="override-new-status"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          New status
        </label>
        <Select
          id="override-new-status"
          value={newStatus}
          onChange={(e) =>
            setNewStatus(
              (e.target as HTMLSelectElement).value as "pending" | "achieved",
            )
          }
          disabled={submitting}
        >
          <option value="achieved">Approve (achieved)</option>
          <option value="pending">Reopen (pending)</option>
        </Select>
        <p className="mt-1 text-xs text-slate-500">
          Current status: <span className="font-medium">{currentStatus}</span>
        </p>
      </div>

      <div>
        <label
          htmlFor="override-reason"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Reason for override <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="override-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          rows={3}
          placeholder="e.g. Video shows incorrect kick technique on stroke #4."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
        />
      </div>

      <div>
        <label
          htmlFor="override-coach-notes"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Replace coach notes (optional)
        </label>
        <textarea
          id="override-coach-notes"
          value={coachNotes}
          onChange={(e) => setCoachNotes(e.target.value)}
          disabled={submitting}
          rows={2}
          placeholder="Leave empty to keep the coach's existing notes."
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || !reason.trim()}
        >
          {submitting ? "Saving…" : "Record override"}
        </Button>
      </div>
    </Modal>
  );
}
