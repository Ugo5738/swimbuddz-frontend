"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { mediaVaultApi } from "@/lib/media-vault";
import { type VaultMedia } from "@/lib/media-vault";
import { CalendarDays, FileVideo, Play, Video } from "lucide-react";
import { MemberClipTool } from "./MemberClipTool";
import { MySwimUploads } from "./MySwimUploads";

type SharedVideo = {
  media: VaultMedia;
  vault_title: string;
  capture_date: string;
  session_id: string | null;
  session_title?: string | null;
  session_starts_at?: string | null;
  location_name?: string | null;
  session_type?: string | null;
};
type MyVideosResponse = {
  items: SharedVideo[];
  total: number;
  page: number;
  page_size: number;
};

export function MySessionVideos() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<MyVideosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SharedVideo | null>(null);
  const [duration, setDuration] = useState(0);
  const [previewWorking, setPreviewWorking] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const retryPlayback = async (id: string) => {
    setPreviewWorking(true); setPreviewError(null);
    try {
      await apiPost(`/api/v1/media/vaults/my-media/${id}/preview`, {}, { auth: true });
      setRefreshIndex((value) => value + 1);
    } catch(e) { setPreviewError(e instanceof Error ? e.message : "Could not prepare playback"); }
    finally { setPreviewWorking(false); }
  };
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const downloadOriginal = async (item: VaultMedia) => {
    setDownloading(true); setDownloadError(null);
    try {
      const result = await mediaVaultApi.authorizeMemberDownload(item.id);
      const link = document.createElement("a");
      link.href = result.url;
      link.download = result.filename;
      link.rel = "noopener";
      link.click();
    } catch (e) { setDownloadError(e instanceof Error ? e.message : "Download unavailable"); }
    finally { setDownloading(false); }
  };
  const [filter, setFilter] = useState<"all" | "academy" | "club" | "community" | "personal">("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<MyVideosResponse>(`/api/v1/media/vaults/my-videos?page=${page}&page_size=24`, { auth: true })
      .then((response) => { if (active) { setData(response); setError(null); } })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Videos could not be loaded"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, refreshIndex]);
  useEffect(() => {
    if (!selected || selected.media.preview_url || selected.media.preview_status === "failed") return;
    const timer = window.setInterval(() => setRefreshIndex(v => v + 1), 6000);
    return () => window.clearInterval(timer);
  }, [selected?.media.id, selected?.media.preview_url]);
  useEffect(() => {
    if (!selected || !data) return;
    const updated = data.items.find((entry) => entry.media.id === selected.media.id);
    if (updated && updated.media.preview_url !== selected.media.preview_url) setSelected(updated);
  }, [data, selected?.media.id, selected?.media.preview_url]);

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 24));
  const category = (video: SharedVideo): "academy" | "club" | "community" | "personal" => {
    const type = (video.session_type || "").toLowerCase();
    const labels = video.media.labels.map(label => label.toLowerCase());
    if (type.includes("cohort") || type.includes("academy") || labels.includes("academy")) return "academy";
    if (type.includes("club") || labels.includes("club")) return "club";
    if (!video.session_id) return "personal";
    return "community";
  };
  const videos = (data?.items ?? []).filter((entry) => filter === "all" || category(entry) === filter);
  const sessions = videos.reduce<Record<string, SharedVideo[]>>((groups, entry) => {
    const key = entry.session_id || entry.vault_title;
    (groups[key] ??= []).push(entry);
    return groups;
  }, {});
  return (
    <section className="space-y-5" aria-label="My session videos">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">My Media</h2>
        <p className="mt-1 text-sm text-slate-600">
          Approved photos and videos shared with you from Academy, Club, Community or personal practice.
          Your private uploads are organised below.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading your videos…</p>}
      {!loading && !error && !data?.items.length && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <FileVideo className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          No media has been shared with you yet. Your instructors or the media team can add it after review.
        </div>
      )}
      <label className="block text-sm font-medium text-slate-700">Show videos from
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="ml-3 rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="all">All swims</option><option value="academy">Academy</option>
          <option value="club">Club</option><option value="community">Community</option><option value="personal">Personal / standalone</option>
        </select>
      </label>
      <div className="space-y-6">
        {Object.entries(sessions).map(([key, entries]) => (
          <section key={key} className="space-y-3">
            <div><h3 className="font-semibold text-slate-900">{entries[0].session_title || entries[0].vault_title}</h3>
              <p className="text-xs text-slate-600">{entries[0].location_name || ""}
                {entries[0].session_starts_at ? ` · ${new Date(entries[0].session_starts_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}` : ""}
              </p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
          <button type="button" key={entry.media.id} onClick={() => { setSelected(entry); setDuration(0); }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            aria-label={`View video from ${entry.session_title || entry.vault_title}`}>
            <div className="relative aspect-video bg-slate-100">
              {entry.media.thumbnail_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={entry.media.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center text-slate-400"><Video className="h-10 w-10" /></div>}
              <Play className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-slate-900/80 p-2 text-white" />
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900">{entry.session_title || entry.vault_title}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(entry.session_starts_at || `${entry.capture_date}T12:00:00`).toLocaleDateString("en-NG", { dateStyle: "medium" })}
              </p>
            </div>
          </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {(data?.total ?? 0) > 24 && (
        <nav aria-label="My video pages" className="flex items-center justify-between rounded-xl border bg-white p-3">
          <span className="text-sm text-slate-600">Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={loading || page <= 1} onClick={() => setPage(page - 1)}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button>
            <button type="button" disabled={loading || page >= pages} onClick={() => setPage(page + 1)}
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button>
          </div>
        </nav>
      )}
      <MySwimUploads />
      {selected && (
        <div role="dialog" aria-modal="true" aria-label="Session video" className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/85 p-2 sm:p-4"
          onClick={() => setSelected(null)}>
          <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-2rem)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-3 sm:p-4">
              <h2 className="truncate font-semibold text-slate-900">{selected.session_title || selected.vault_title}</h2>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-sm">Close</button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-8 sm:p-4">
            {selected.media.media_type === "IMAGE" ? (
              selected.media.preview_url || selected.media.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.media.preview_url || selected.media.thumbnail_url || ""} alt={selected.media.original_filename || "Shared swim photo"} className="mx-auto max-h-[55dvh] max-w-full rounded-lg object-contain" />
              ) : <div className="rounded-lg bg-slate-100 p-8 text-center">
                <p>Photo preview is being prepared.</p>
                <button type="button" onClick={() => void retryPlayback(selected.media.id)} disabled={previewWorking}
                  className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm text-white disabled:opacity-50">Prepare photo preview</button>
                {previewError && <p role="alert" className="mt-2 text-sm text-red-600">{previewError}</p>}
              </div>
            ) : selected.media.preview_url ? (
              <video controls playsInline preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} poster={selected.media.thumbnail_url ?? undefined} src={selected.media.preview_url}
                className="mx-auto max-h-[48dvh] w-full rounded-lg bg-black object-contain sm:max-h-[58dvh]" />
            ) : (
              <div className="rounded-lg bg-slate-100 p-8 text-center text-slate-700">
                <p>{previewWorking ? "Requesting your preview…" : "A playable copy is being prepared. You can request a retry here without contacting an administrator."}</p>
                <button type="button" onClick={() => void retryPlayback(selected.media.id)} disabled={previewWorking}
                  className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {previewWorking ? "Preparing…" : "Prepare or retry playback"}
                </button>
                {previewError && <p role="alert" className="mt-2 text-sm text-red-600">{previewError}</p>}
              </div>
            )}
            {selected.media.allow_member_clips && selected.media.preview_url && (
              <div className="mt-4"><MemberClipTool videoId={selected.media.id} duration={duration} /></div>
            )}
            {selected.media.allow_member_downloads && (
              <div className="mt-3"><button type="button" disabled={downloading} onClick={() => void downloadOriginal(selected.media)} className="rounded-lg border border-cyan-700 px-4 py-2 text-sm font-semibold text-cyan-800 disabled:opacity-40">{downloading ? "Preparing download…" : "Download full recording"}</button></div>
            )}
            {downloadError && <p role="alert" className="mt-2 text-sm text-red-600">{downloadError}</p>}
            <p className="mt-3 text-xs text-slate-500">
              For your personal viewing. Sharing or publishing videos of other swimmers requires their consent.
            </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
