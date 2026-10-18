"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { VaultMedia } from "@/lib/media-vault";
import { FileVideo, RefreshCcw } from "lucide-react";

type Page = { items: VaultMedia[]; total: number; page: number; page_size: number };

export function MySwimUploads({ refreshKey }: { refreshKey?: number }) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const share = async (item: VaultMedia) => {
    setBusy(true); setError("");
    try {
      await apiPost(`/api/v1/media/vaults/my-media/${item.id}/share-community`, {share_with_community:item.session_visibility !== "community"}, {auth:true});
      await refresh();
    } catch(e) {setError(e instanceof Error?e.message:"Could not change sharing");}
    finally {setBusy(false);}
  };
  const refresh = async () => {
    setBusy(true); setError("");
    try {
      setData(await apiGet<Page>(`/api/v1/media/vaults/my-swim-uploads?page=${page}&page_size=24`, { auth: true }));
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't load your uploads"); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, [page, refreshKey]);

  const requestPreview = async (item: VaultMedia) => {
    setBusy(true);
    try {
      await apiPost(
        `/api/v1/media/vaults/${item.vault_id}/items/${item.id}/preview/generate`,
        {}, { auth: true }
      );
      await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not prepare playback"); }
    finally { setBusy(false); }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-semibold text-slate-900">My uploaded swims</h3>
          <p className="text-xs text-slate-600">Only you and authorised SwimBuddz administrators can access these while private.</p>
        </div>
        <button type="button" disabled={busy} onClick={() => void refresh()} aria-label="Refresh uploads"
          className="rounded-lg border p-2 text-slate-600 disabled:opacity-40"><RefreshCcw className="h-4 w-4" /></button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {data?.items.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No swim videos uploaded yet.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.items.map((item) => (
          <div key={item.id} className="min-w-0 rounded-xl border border-slate-200 p-3">
            {item.media_type === "VIDEO" && item.preview_url && playing === item.id ? (
              <video controls playsInline preload="metadata" src={item.preview_url}
                className="mb-2 aspect-video w-full rounded-lg bg-black" />
            ) : (
              <div className="mb-2 flex aspect-video items-center justify-center rounded-lg bg-slate-100">
                {item.thumbnail_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={item.thumbnail_url} alt="" loading="lazy" className="h-full w-full rounded-lg object-cover" />
                ) : <FileVideo className="h-8 w-8 text-slate-400" />}
              </div>
            )}
            <p className="truncate text-sm font-semibold">{item.original_filename || "My swim video"}</p>
            <p className="mt-1 text-xs text-slate-500">Admin review: {item.review_status.replaceAll("_", " ")}</p>
            {item.source_session_id && <p className="mt-1 text-xs text-cyan-700">Linked to a swimming session</p>}
            {["approved","published"].includes(item.review_status) && item.consent_status === "cleared" && <button type="button" disabled={busy} onClick={()=>void share(item)} className="mt-3 block text-sm font-medium text-cyan-700 underline disabled:opacity-40">{item.session_visibility === "community" ? "Keep personal again" : "Share with SwimBuddz members"}</button>}
            {item.media_type === "VIDEO" && (
              <button type="button" disabled={busy} onClick={() => {
                if (item.preview_url) setPlaying((old) => old === item.id ? null : item.id);
                else void requestPreview(item);
              }} className="mt-3 text-sm font-medium text-cyan-700 underline disabled:opacity-40">
                {item.preview_url ? playing === item.id ? "Hide player" : "Watch my upload" : "Prepare playback"}
              </button>
            )}
          </div>
        ))}
      </div>
      {(data?.total ?? 0) > 24 && (
        <div className="flex items-center justify-between text-sm">
          <button type="button" disabled={busy || page === 1} onClick={() => setPage(v => v - 1)}>Previous</button>
          <span>Page {page} of {Math.ceil((data?.total ?? 0) / 24)}</span>
          <button type="button" disabled={busy || page * 24 >= (data?.total ?? 0)} onClick={() => setPage(v => v + 1)}>Next</button>
        </div>
      )}
    </section>
  );
}
