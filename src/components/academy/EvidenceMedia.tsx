"use client";

import { Expand, Loader2, Play, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { useMediaUrl } from "@/hooks/useMediaUrl";
import { buildMediaPlaybackUrl, isLikelyVideoUrl } from "@/lib/media";

/**
 * In-app viewer for milestone evidence (image or video).
 *
 * Shows an inline preview that expands to a full-screen overlay on click.
 * Reused across the coach review page (``/coach/students/[id]``), the
 * member's own enrollment page (``/(member)/account/academy/enrollments/[id]``),
 * and any other surface that needs to display a single ``MediaItem``.
 *
 * For the **member** flow specifically: a student needs to be able to
 * see what video they uploaded for each milestone — both to confirm the
 * upload landed and to remind themselves what the coach is reviewing.
 * Before this component was lifted out, only the coach page rendered
 * the video, so students saw their own notes but no proof of upload.
 *
 * Defers all URL resolution to ``useMediaUrl`` which presigns the
 * private-bucket URL on demand and caches it.
 */
export function EvidenceMedia({
  mediaId,
  label = "Student Evidence",
}: {
  mediaId: string;
  /** Header label shown above the preview tile. Defaults to "Student Evidence";
   *  member-side surfaces can pass "Your Evidence" instead. */
  label?: string;
}) {
  const [url, isLoading] = useMediaUrl(mediaId);
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-3 bg-cyan-50 rounded-lg flex items-center gap-2 text-sm text-cyan-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading {label.toLowerCase()}...
      </div>
    );
  }

  if (!url) {
    return (
      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-500">
        Evidence uploaded but could not be loaded.
      </div>
    );
  }

  const isVideo = isLikelyVideoUrl(url);
  // Videos go through the playback redirect endpoint so the <video>
  // element gets a fresh, cacheable presigned URL on every Range request
  // — direct presigned URLs expire and cause mid-playback failures.
  const playbackUrl = isVideo ? buildMediaPlaybackUrl(mediaId) : url;

  return (
    <>
      <div className="rounded-lg overflow-hidden border border-slate-200">
        <div className="px-3 py-1.5 bg-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">{label}</span>
          </div>
          <button
            onClick={() => setShowFullscreen(true)}
            className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
          >
            <Expand className="h-3 w-3" />
            Full screen
          </button>
        </div>
        {isVideo ? (
          <video controls preload="metadata" className="w-full max-h-72" src={playbackUrl}>
            Your browser does not support video playback.
          </video>
        ) : (
          <button onClick={() => setShowFullscreen(true)} className="w-full cursor-pointer">
            <Image
              src={url}
              alt={label}
              width={0}
              height={0}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="w-full max-h-72 object-contain bg-slate-50"
              style={{ width: "100%", height: "auto" }}
            />
          </button>
        )}
      </div>

      {/* Fullscreen in-app overlay */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="max-w-5xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {isVideo ? (
              <video controls autoPlay className="w-full max-h-[90vh] rounded-lg" src={playbackUrl}>
                Your browser does not support video playback.
              </video>
            ) : (
              <Image
                src={url}
                alt={label}
                width={0}
                height={0}
                sizes="100vw"
                className="w-full max-h-[90vh] object-contain rounded-lg"
                style={{ width: "100%", height: "auto" }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
