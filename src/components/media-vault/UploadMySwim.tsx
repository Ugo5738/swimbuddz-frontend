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
  useEffect(() => {
    apiGet<AttendedSession[]>("/api/v1/media/vaults/my-swim-sessions", { auth: true })
      .then(setSessions).catch(() => setSessions([]));
  }, []);
  const [error, setError] = useState("");
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
          Add your swimming practice, lessons or personal progress videos. They are private
          by default, not automatically shared with session participants or published.
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
            <select id="my-swim-session" value={sessionId} onChange={event => setSessionId(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm">
              <option value="">Personal practice — no session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title} · {new Date(session.starts_at).toLocaleDateString("en-NG")} {session.location_name ? `· ${session.location_name}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">Only swims with recorded attendance appear here. Selecting a session does not share your upload automatically.</p>
          </div>
          <VaultUploader key={`${vault.id}:${sessionId}`} vault={vault}
            associatedSessionId={sessionId || null} scope={{ kind: "member", vaultId: vault.id }} />
        </div>
      )}
      <MySwimUploads />
    </section>
  );
}
