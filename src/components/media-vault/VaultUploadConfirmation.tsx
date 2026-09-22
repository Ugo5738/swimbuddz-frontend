"use client";

import type { GuestVault, MediaVault } from "@/lib/media-vault";
import { CloudUpload, Loader2, RefreshCcw, ShieldCheck } from "lucide-react";

export function VaultUploadConfirmation({
  vault,
  consent,
  notes,
  uploading,
  online,
  hasPending,
  hasFailed,
  onConsentChange,
  onNotesChange,
  onStart,
}: {
  vault: MediaVault | GuestVault;
  consent: boolean;
  notes: string;
  uploading: boolean;
  online: boolean;
  hasPending: boolean;
  hasFailed: boolean;
  onConsentChange: (value: boolean) => void;
  onNotesChange: (value: string) => void;
  onStart: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => onConsentChange(event.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-cyan-600"
        />
        <span>
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Consent and safeguarding confirmation
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            {vault.consent_notice ??
              "I confirm these files were captured for SwimBuddz, respect participant opt-outs, and are appropriate for the social media team to review."}
          </span>
        </span>
      </label>
      <textarea
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
        placeholder="Optional handoff notes: standout moments, people to avoid, missing shots…"
        className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500"
      />
      <button
        type="button"
        disabled={!hasPending || uploading || !online || !consent}
        onClick={onStart}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Keep this page open · uploading
          </>
        ) : hasFailed ? (
          <>
            <RefreshCcw className="h-5 w-5" /> Resume uploads
          </>
        ) : (
          <>
            <CloudUpload className="h-5 w-5" /> Start full-quality upload
          </>
        )}
      </button>
      {!consent && (
        <p className="mt-2 text-center text-xs text-slate-500">
          Confirm consent to enable upload.
        </p>
      )}
    </div>
  );
}
