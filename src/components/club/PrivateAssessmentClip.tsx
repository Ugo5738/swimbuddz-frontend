"use client";

import { useMediaUrl } from "@/hooks/useMediaUrl";

export function PrivateAssessmentClip({ mediaId, label }: { mediaId: string; label: string }) {
  const [url, loading] = useMediaUrl(mediaId);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {loading ? <p className="text-sm text-slate-500">Preparing private video…</p>
        : url ? <video key={url} controls playsInline preload="metadata" src={url} className="w-full max-h-80 rounded-lg bg-black" />
        : <p role="alert" className="text-sm text-red-700">This private video is unavailable. Please retry.</p>}
    </div>
  );
}
