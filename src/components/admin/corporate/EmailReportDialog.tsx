"use client";

// Small dialog that lets the admin send the program outcome report to the
// HR contact. The note + report URL fields are optional — the backend
// fills in sensible defaults if they're missing.

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { toast } from "sonner";

import { corporateApi } from "@/lib/corporate/api";

interface Props {
  programId: string;
  reportUrl: string;
  open: boolean;
  onClose: () => void;
}

export function EmailReportDialog({
  programId,
  reportUrl,
  open,
  onClose,
}: Props) {
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  if (!open) return null;

  async function onSend() {
    setSending(true);
    try {
      const res = await corporateApi.emailProgramReport(programId, {
        custom_note: note.trim() || null,
        report_url: reportUrl,
      });
      if (res.delivered) {
        toast.success(`Report emailed to ${res.recipient_email}`);
      } else {
        toast.error(
          `Could not deliver email to ${res.recipient_email} — try again or send manually.`,
        );
      }
      setNote("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to email report");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-5 w-5 text-sky-600" />
            Email report to HR
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll send the program&apos;s primary contact a short summary
          with the headline numbers and a link back to this page.
        </p>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Personal note <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={4}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="One line addressed to the HR contact — e.g. 'Quick mid-cohort update before our week-6 check-in.'"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {sending ? "Sending…" : "Send email"}
          </button>
        </div>
      </div>
    </div>
  );
}
