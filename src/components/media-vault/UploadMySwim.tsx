"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { MySwimUploads } from "./MySwimUploads";
import { apiPost } from "@/lib/api";
import type { MediaVault } from "@/lib/media-vault";
import { VaultUploader } from "./VaultUploader";
import { CloudUpload, LockKeyhole } from "lucide-react";

type AttendedSession = { id: string; title: string; starts_at: string; location_name?: string | null };

export function UploadMySwim() {
  const [vault, setVault] = useState<MediaVault | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<AttendedSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [sessionVault, setSessionVault] = useState<MediaVault | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    apiGet<AttendedSession[]>("/api/v1/media/vaults/my-swim-sessions", { auth: true })
      .then(setSessions).catch(() => setSessions([]));
  }, []);
  const [error, setError] = useState("");
  const selectSession = async (value: string) => {
    setSessionId(value); setSessionVault(null); setError("");
    if (!value) return;
    setLoadingSession(true);
    try {
      setSessionVault(await apiPost<MediaVault>(`/api/v1/media/vaults/my-session-vault/${value}`, {}, { auth: true }));
    } catch (err) { setError(err instanceof Error ? err.message : "Could not access this session"); }
    finally { setLoadingSession(false); }
  };
  const open = async () => {
    setBusy(true); setError("");
    try {
      setVault(await apiPost<MediaVault>("/api/v1/media/vaults/my-swim-vault", {}, { auth: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare your upload");
    } finally { setBusy(false); }
  };
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <CloudUpload className="h-5 w-5" /> Upload My Swim
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Add your swimming practice, lessons or personal progress videos. Unassociated personal practice stays private. For an attended session, your files go into its shared Vault and become visible only after review and consent clearance.
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
          <LockKeyhole className="h-4 w-4" /> SwimBuddz administrators can review your submitted recordings.
        </p>
        {!vault && (
          <button type="button" disabled={busy} onClick={() => void open()}
            className="mt-4 rounded-lg bg-cyan-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Preparing…" : "Choose photos or videos"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {vault && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <label htmlFor="my-swim-session" className="block text-sm font-semibold text-slate-800">Which swim was this from?</label>
            <select id="my-swim-session" value={sessionId} disabled={uploading} onChange={event => void selectSession(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm">
              <option value="">Personal practice — no session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title} · {new Date(session.starts_at).toLocaleDateString("en-NG")} {session.location_name ? `· ${session.location_name}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Choosing an attended session uploads into that session’s shared Vault. Approval and consent clearance are required before other attendees can view your files.</p>
          </div>
          {loadingSession && <p role="status">Opening your session media workspace…</p>}
          {(!sessionId || sessionVault) && <VaultUploader key={`${sessionVault?.id || vault.id}:${sessionId}`}
            vault={sessionVault || vault} onUploadingChange={setUploading}
            scope={{ kind: "member", vaultId: (sessionVault || vault).id }} />}
        </div>
      )}
      <MySwimUploads />
    </section>
  );
}
