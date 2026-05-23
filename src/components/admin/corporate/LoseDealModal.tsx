"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  type CorporateDeal,
  type DealLostReason,
  corporateApi,
} from "@/lib/corporate/api";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  deal: CorporateDeal;
  isOpen: boolean;
  onClose: () => void;
  onLost: () => void;
};

const REASON_OPTIONS: { value: DealLostReason; label: string }[] = [
  { value: "price", label: "Price" },
  { value: "timing", label: "Timing" },
  { value: "internal_priorities", label: "Internal priorities" },
  { value: "budget_frozen", label: "Budget frozen" },
  { value: "competitor", label: "Competitor" },
  { value: "logistics", label: "Logistics" },
  { value: "no_response", label: "No response" },
  { value: "other", label: "Other" },
];

export function LoseDealModal({ deal, isOpen, onClose, onLost }: Props) {
  const [reason, setReason] = useState<DealLostReason>("no_response");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await corporateApi.loseDeal(deal.id, {
        lost_reason: reason,
        lost_notes: notes.trim() || null,
      });
      toast.success("Deal closed-lost");
      onLost();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to close deal";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close deal as lost">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Marking <strong>{deal.title}</strong> as lost. Pick the dominant
          reason — this feeds ICP refinement for future outreach.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as DealLostReason)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={submitting}>
            {submitting ? "Saving…" : "Close as lost"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
