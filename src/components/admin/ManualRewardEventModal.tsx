"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { Send, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ManualRewardEventModalProps = {
  onClose: () => void;
  onSuccess: () => void;
};

const EVENT_TYPES = [
  "session.attended",
  "attendance.streak",
  "referral.successful",
  "referral.ambassador_milestone",
  "academy.graduated",
  "academy.milestone",
  "academy.perfect_attendance",
  "community.volunteer",
  "community.peer_coaching",
  "content.share",
  "rideshare.offered",
  "topup.first",
  "topup.large",
  "store.purchase",
  "tier.upgrade",
];

type SubmitResult = {
  bubbles_awarded?: number;
  rule_matched?: string;
  message?: string;
};

export function ManualRewardEventModal({ onClose, onSuccess }: ManualRewardEventModalProps) {
  const [memberAuthId, setMemberAuthId] = useState("");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [eventData, setEventData] = useState("{}");
  const [adminConfirmed, setAdminConfirmed] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!memberAuthId.trim()) {
      toast.error("Member Auth ID is required");
      return;
    }

    let parsedData: Record<string, unknown> = {};
    try {
      parsedData = JSON.parse(eventData);
    } catch {
      toast.error("Event data must be valid JSON");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost<SubmitResult>(
        "/api/v1/admin/wallet/rewards/events/submit",
        {
          member_auth_id: memberAuthId.trim(),
          event_type: eventType,
          event_data: parsedData,
          admin_confirmed: adminConfirmed,
        },
        { auth: true }
      );

      if (result.bubbles_awarded && result.bubbles_awarded > 0) {
        toast.success(
          `Reward granted: +${result.bubbles_awarded} Bubbles (${result.rule_matched || eventType})`
        );
      } else {
        toast(result.message || "Event submitted — no matching rule or already maxed");
      }
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Submit Reward Event</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Member Auth ID</label>
            <input
              type="text"
              value={memberAuthId}
              onChange={(e) => setMemberAuthId(e.target.value)}
              placeholder="e.g., abc123-def456-..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Event Data (JSON)
            </label>
            <textarea
              value={eventData}
              onChange={(e) => setEventData(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={adminConfirmed}
              onChange={(e) => setAdminConfirmed(e.target.checked)}
              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
            />
            Admin confirmed
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-1.5" />
              {submitting ? "Submitting..." : "Submit Event"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
