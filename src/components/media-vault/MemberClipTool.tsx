"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { Scissors, Download } from "lucide-react";

type Clip = {
  id: string;
  status: "pending" | "processing" | "ready" | "failed";
  start_ms: number;
  end_ms: number;
  expires_at: string;
  download_url: string | null;
};

const display = (sec: number) => {
  const value = Math.max(0, Math.floor(sec));
  return `${Math.floor(value / 60).toString().padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
};

export function MemberClipTool({ videoId, duration }: { videoId: string; duration: number }) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(15);
  const [clip, setClip] = useState<Clip | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [lastClipId, setLastClipId] = useState<string | null>(null);
  const total = Math.floor(duration);

  useEffect(() => {
    if (!clip || !["pending", "processing"].includes(clip.status)) return;
    let active = true;
    const poll = window.setInterval(() => {
      apiGet<Clip>(`/api/v1/media/vaults/my-videos/clips/${clip.id}`, { auth: true })
        .then((next) => { if (active) setClip(next); })
        .catch((e) => { if (active) { setError(e instanceof Error ? e.message : "Clip status unavailable"); setClip(null); } });
    }, 3500);
    return () => { active = false; clearInterval(poll); };
  }, [clip?.id, clip?.status]);

  const makeClip = async () => {
    setWorking(true); setError(""); setClip(null);
    try {
      const result = await apiPost<Clip>(
        `/api/v1/media/vaults/my-videos/${videoId}/clips`,
        { start_ms: Math.round(start * 1000), end_ms: Math.round(end * 1000) },
        { auth: true }
      );
      setClip(result);
      setLastClipId(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare clip");
    } finally { setWorking(false); }
  };

  if (!Number.isFinite(duration) || total < 2) {
    return <p className="text-xs text-slate-600">Load the video to select a clip.</p>;
  }
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Scissors className="h-4 w-4" /> Save a short clip
      </h3>
      <p className="text-xs text-slate-600">
        Choose any portion of the recording from the lighter playback copy. Your full recording stays unchanged.
        Up to five clips per day; download link expires after 24 hours.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs font-medium text-slate-700">
          Start · {display(start)}
          <input aria-label="Clip start" type="range" min={0} max={Math.max(0,total - 1)}
            value={start} onChange={(e) => {
              const next = Number(e.target.value);
              setStart(next);
              setEnd(Math.max(next + 1, Math.min(end, total)));
            }} className="mt-2 w-full" />
        </label>
        <label className="text-xs font-medium text-slate-700">
          End · {display(end)}
          <input aria-label="Clip end" type="range" min={1} max={total} value={Math.min(end,total)}
            onChange={(e) => {
              const next = Number(e.target.value);
              setEnd(next);
              setStart(Math.min(start, Math.max(0,next - 1)));
            }} className="mt-2 w-full" />
        </label>
      </div>
      <button type="button" onClick={() => void makeClip()}
        disabled={working || end - start < 1 || end > total}
        className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        {working ? "Requesting…" : "Create clip"}
      </button>
      {clip && ["pending", "processing"].includes(clip.status) && (
        <p role="status" className="text-sm text-slate-600">Your clip is being prepared. Keep this view open for the download.</p>
      )}
      {clip?.status === "ready" && clip.download_url && (
        <a href={clip.download_url} download="my-swim-clip.mp4" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-cyan-600 px-4 py-2.5 text-sm font-semibold text-cyan-800">
          <Download className="h-4 w-4" /> Download my clip
        </a>
      )}
      {clip?.status === "failed" && <p role="alert" className="text-sm text-red-600">Clip processing failed. Please try a shorter selection or contact the media team.</p>}
      {lastClipId && !clip && <p className="text-xs text-slate-500">Your request was created: {lastClipId}. You can retry status using a fresh request.</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </section>
  );
}
