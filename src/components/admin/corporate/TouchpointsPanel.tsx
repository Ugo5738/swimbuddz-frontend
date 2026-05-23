"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type CorporateDeal,
  type CorporateTouchpoint,
  type TouchpointDirection,
  type TouchpointType,
  corporateApi,
} from "@/lib/corporate/api";
import { useState } from "react";
import { toast } from "sonner";

const TOUCHPOINT_TYPES: TouchpointType[] = [
  "email_intro",
  "email_followup_1",
  "email_followup_2",
  "intro_call",
  "proposal_shared",
  "demo",
  "whatsapp",
  "phone_call",
  "in_person",
  "note",
];

function labelize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TouchpointsPanel({
  contactId,
  deals,
  touchpoints,
  onChange,
}: {
  contactId: string;
  deals: CorporateDeal[];
  touchpoints: CorporateTouchpoint[];
  onChange: () => void;
}) {
  const [type, setType] = useState<TouchpointType>("email_intro");
  const [direction, setDirection] = useState<TouchpointDirection>("outbound");
  const [dealId, setDealId] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await corporateApi.createTouchpoint(contactId, {
        type,
        direction,
        deal_id: dealId || null,
        summary: summary.trim() || null,
        outcome: outcome.trim() || null,
        next_action: nextAction.trim() || null,
      });
      toast.success("Touchpoint logged");
      setSummary("");
      setOutcome("");
      setNextAction("");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="p-5 lg:col-span-1 lg:sticky lg:top-4 h-fit">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
          Log a touchpoint
        </h2>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TouchpointType)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
            >
              {TOUCHPOINT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {labelize(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Direction
            </label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as TouchpointDirection)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
            >
              <option value="outbound">Outbound</option>
              <option value="inbound">Inbound</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tied to deal (optional)
            </label>
            <select
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm bg-white"
            >
              <option value="">— none —</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Summary
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Sent intro pitch"
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Outcome
            </label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Next action
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Logging…" : "Log touchpoint"}
          </Button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide mb-3">
          History
        </h2>
        {touchpoints.length === 0 ? (
          <p className="text-sm text-slate-500">
            No touchpoints recorded yet. Use the form to log your first
            outreach.
          </p>
        ) : (
          <ol className="space-y-3">
            {touchpoints.map((tp) => (
              <li key={tp.id} className="border-l-2 border-slate-100 pl-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {labelize(tp.type)}
                  </span>
                  <span>·</span>
                  <span>{labelize(tp.direction)}</span>
                  <span>·</span>
                  <span>{new Date(tp.occurred_at).toLocaleString()}</span>
                </div>
                {tp.summary && (
                  <p className="text-sm text-slate-900 mt-1">{tp.summary}</p>
                )}
                {tp.outcome && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="text-xs text-slate-500">Outcome:</span>{" "}
                    {tp.outcome}
                  </p>
                )}
                {tp.next_action && (
                  <p className="text-sm text-slate-700 mt-1">
                    <span className="text-xs text-slate-500">Next:</span>{" "}
                    {tp.next_action}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
