"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { type VaultMedia } from "@/lib/media-vault";
import { CalendarDays, FileVideo, Play, Video } from "lucide-react";
import { MemberClipTool } from "./MemberClipTool";

type SharedVideo = {
  media: VaultMedia;
  vault_title: string;
  capture_date: string;
  session_id: string | null;
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

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<MyVideosResponse>(`/api/v1/media/vaults/my-videos?page=${page}&page_size=24`, { auth: true })
      .then((response) => { if (active) { setData(response); setError(null); } })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : "Videos could not be loaded"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 24));
  return (
    <section className="space-y-5" aria-label="My session videos">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">My session videos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Videos shared with you from Academy, Club and Community sessions. Your historical videos remain here after a cohort closes.
        </p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading your videos…</p>}
      {!loading && !error && !data?.items.length && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <FileVideo className="mx-auto mb-3 h-9 w-9 text-slate-400" />
          No personal videos have been shared with you yet. Your instructors or the media team can add them after review.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.items.map((entry) => (
          <button type="button" key={entry.media.id} onClick={() => { setSelected(entry); setDuration(0); }}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            aria-label={`View video from ${entry.vault_title}`}>
            <div className="relative aspect-video bg-slate-100">
              {entry.media.thumbnail_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={entry.media.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center text-slate-400"><Video className="h-10 w-10" /></div>}
              <Play className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-slate-900/80 p-2 text-white" />
            </div>
            <div className="p-4">
              <p className="font-semibold text-slate-900">{entry.vault_title}</p>
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(`${entry.capture_date}T12:00:00`).toLocaleDateString("en-NG", { dateStyle: "medium" })}
              </p>
            </div>
          </button>
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
      {selected && (
        <div role="dialog" aria-modal="true" aria-label="Session video" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3"
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-4xl rounded-xl bg-white p-4" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="truncate font-semibold text-slate-900">{selected.vault_title}</h2>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-3 py-2 text-sm">Close</button>
            </div>
            {selected.media.preview_url ? (
              <video controls playsInline preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} poster={selected.media.thumbnail_url ?? undefined} src={selected.media.preview_url}
                className="max-h-[75vh] w-full rounded-lg bg-black" />
            ) : (
              <p className="rounded-lg bg-slate-100 p-10 text-center text-slate-600">
                This video has not yet been prepared for streaming. Please ask the media team to generate its review preview.
              </p>
            )}
            {selected.media.allow_member_clips && selected.media.preview_url && (
              <div className="mt-4"><MemberClipTool videoId={selected.media.id} duration={duration} /></div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              For your personal viewing. Sharing or publishing videos of other swimmers requires their consent.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
