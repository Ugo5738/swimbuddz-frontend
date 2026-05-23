"use client";

// Admin control panel for the automated outreach sequence on a single
// contact. Sits inside the contact detail page; reads state on mount,
// exposes Start / Pause / Resume / Send-now buttons and a "Preview"
// drawer that renders all 3 emails so the admin sees the copy before
// turning autopilot on.

import { useEffect, useState } from "react";
import {
  Eye,
  Mail,
  Pause,
  Play,
  RotateCw,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/Card";
import {
  type OutreachPreview,
  type OutreachState,
  corporateApi,
} from "@/lib/corporate/api";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function OutreachPanel({ contactId }: { contactId: string }) {
  const [state, setState] = useState<OutreachState | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previews, setPreviews] = useState<OutreachPreview[] | null>(null);

  async function refresh() {
    try {
      const s = await corporateApi.getOutreachState(contactId);
      setState(s);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load outreach state",
      );
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  async function wrap<T>(action: () => Promise<T>, success: string) {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function openPreview() {
    setPreviewing(true);
    if (previews) return;
    try {
      const list = await corporateApi.previewOutreach(contactId);
      setPreviews(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load preview");
      setPreviewing(false);
    }
  }

  async function sendNow() {
    setBusy(true);
    try {
      const result = await corporateApi.sendNextOutreach(contactId);
      if (result.sent) {
        toast.success(`Email ${result.email_number} sent`);
      } else {
        toast.message(result.reason || "Nothing to send right now");
      }
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  if (state === null) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Loading outreach state…</p>
      </Card>
    );
  }

  const isStarted = state.outreach_started_at !== null;
  const isPaused = state.outreach_paused;
  const isDone = state.next_email_number === null && isStarted;

  return (
    <Card>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600" />
            Automated outreach
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            3-email sequence per the playbook. Day 1 → Day 7 → Day 14.
          </p>
        </div>
        <button
          onClick={openPreview}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview emails
        </button>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs uppercase text-slate-500">Status</dt>
          <dd className="font-medium text-slate-900">
            {!isStarted && "Not started"}
            {isStarted && isPaused && "Paused"}
            {isStarted && !isPaused && isDone && "Sequence complete"}
            {isStarted && !isPaused && !isDone && "Active"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Started</dt>
          <dd className="font-medium text-slate-900">
            {formatDate(state.outreach_started_at)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Last email sent</dt>
          <dd className="font-medium text-slate-900">
            {formatDate(state.last_outbound_email_at)}{" "}
            {state.last_outbound_email_type && (
              <span className="text-xs text-slate-500">
                ({state.last_outbound_email_type})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Next email</dt>
          <dd className="font-medium text-slate-900">
            {state.next_email_number
              ? `Email ${state.next_email_number}`
              : "—"}
          </dd>
        </div>
      </dl>

      {state.has_inbound_reply && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The contact has replied at some point — autopilot is automatically
          suppressed. Re-engage via a real conversation; if you want the
          sequence to resume anyway, log the reply as outbound or send the
          next email manually.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!isStarted && (
          <button
            disabled={busy}
            onClick={() =>
              wrap(() => corporateApi.startOutreach(contactId), "Sequence started")
            }
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" /> Start sequence
          </button>
        )}
        {isStarted && !isPaused && (
          <button
            disabled={busy}
            onClick={() =>
              wrap(() => corporateApi.pauseOutreach(contactId), "Sequence paused")
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
        )}
        {isStarted && isPaused && (
          <button
            disabled={busy}
            onClick={() =>
              wrap(
                () => corporateApi.resumeOutreach(contactId),
                "Sequence resumed",
              )
            }
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCw className="h-3.5 w-3.5" /> Resume
          </button>
        )}
        {isStarted && !isDone && !isPaused && (
          <button
            disabled={busy}
            onClick={sendNow}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> Send next now
          </button>
        )}
      </div>

      {/* Preview drawer */}
      {previewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setPreviewing(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Outreach email preview
              </h3>
              <button
                onClick={() => setPreviewing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>
            {!previews && (
              <p className="mt-4 text-sm text-slate-600">Rendering…</p>
            )}
            {previews?.map((p) => (
              <div key={p.number} className="mt-6 rounded-lg border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-700">
                  Email {p.number}
                </p>
                <p className="mt-1 font-medium text-slate-900">{p.subject}</p>
                <pre className="mt-3 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm text-slate-700">
                  {p.plain}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
