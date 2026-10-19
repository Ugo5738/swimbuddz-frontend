"use client";

import { useEffect, useState } from "react";
import { apiPost } from "@/lib/api";
import type { MediaVault } from "@/lib/media-vault";
import { VaultLibrary } from "./VaultLibrary";
import { VaultUploader } from "./VaultUploader";

export function SessionMediaWorkspace({ sessionId, action }: {
  sessionId: string; action: "view" | "contribute";
}) {
  const [vault, setVault] = useState<MediaVault | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    apiPost<MediaVault>(
      `/api/v1/media/vaults/my-session-vault/${sessionId}`, {}, { auth:true }
    ).then(data => { if(alive) setVault(data); })
      .catch(e=>{ if(alive) setError(e instanceof Error ? e.message : "Cannot open session media"); });
    return ()=>{alive=false;};
  },[sessionId]);
  if(error) return <div role="alert" className="rounded-xl bg-amber-50 p-5 text-amber-900">{error}</div>;
  if(!vault) return <p role="status">Opening this swim's media workspace…</p>;
  return <section className="space-y-5">
    <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
      <h2 className="font-semibold text-cyan-950">{vault.title}</h2>
      <p className="mt-1 text-sm text-cyan-900">Verified attendees can access approved, consent-cleared recordings. Contributions are reviewed before everyone can view them.</p>
    </div>
    {action === "contribute" && vault.effective_role === "viewer" &&
      <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Contributions are disabled for this session. You can still view approved media.</p>}
    {action === "contribute" && vault.effective_role !== "viewer" &&
      <VaultUploader vault={vault} scope={{kind:"member",vaultId:vault.id}} />}
    <VaultLibrary vaults={[vault]} />
  </section>;
}
