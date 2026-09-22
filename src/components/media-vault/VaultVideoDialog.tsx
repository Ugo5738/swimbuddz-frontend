"use client";

import type { VaultMedia } from "@/lib/media-vault";
import { FileVideo, Loader2, Play, X } from "lucide-react";
import { useEffect } from "react";

export function VaultVideoThumbnail({ item, onWatch }: { item: VaultMedia; onWatch: () => void }) {
  return (
    <>
      {item.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-slate-400">
          <FileVideo className="h-9 w-9" />
        </div>
      )}
      <button
        type="button"
        onClick={onWatch}
        disabled={item.processing_status !== "ready"}
        aria-label={`Watch ${item.original_filename ?? "video"}`}
        className="absolute inset-0 flex items-center justify-center bg-slate-950/10 text-white transition hover:bg-slate-950/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex items-center gap-2 rounded-full bg-slate-950/80 px-3 py-2 text-xs font-semibold shadow-lg">
          <Play className="h-4 w-4 fill-current" /> Watch
        </span>
      </button>
    </>
  );
}

export function VaultVideoDialog({
  item,
  working,
  error,
  onError,
  onRequest,
  onClose,
  canRequest = true,
}: {
  item: VaultMedia;
  working: boolean;
  error: boolean;
  onError: () => void;
  onRequest: (force: boolean) => void;
  onClose: () => void;
  canRequest?: boolean;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Watch ${item.original_filename ?? "video"}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3 sm:p-6"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 p-4">
          <p className="min-w-0 truncate text-sm font-semibold">
            {item.original_filename ?? "Video preview"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="rounded-lg p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {item.preview_url && !error ? (
          <>
            <video
              key={item.preview_url}
              controls
              playsInline
              preload="metadata"
              poster={item.thumbnail_url ?? undefined}
              onError={onError}
              className="max-h-[70dvh] w-full bg-black object-contain"
              aria-label={item.original_filename ?? "Video preview"}
            >
              <source src={item.preview_url} type="video/mp4" />
            </video>
            {canRequest && (
              <button
                type="button"
                onClick={() => onRequest(true)}
                disabled={working}
                className="mx-4 mt-3 text-xs font-semibold text-cyan-300 underline underline-offset-4 disabled:opacity-50"
              >
                Playback slow? Rebuild a lighter mobile preview
              </button>
            )}
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            {working || ["pending", "processing"].includes(item.preview_status) ? (
              <>
                <Loader2 className="h-9 w-9 animate-spin" />
                <p>Preparing a phone-friendly preview. This can take a few minutes for large videos.</p>
              </>
            ) : (
              <>
                <FileVideo className="h-9 w-9" />
                <p>
                  {error
                    ? "This preview could not play on this device."
                    : "No playable preview is ready yet."}
                </p>
                {canRequest ? (
                  <button
                    type="button"
                    onClick={() => onRequest(error)}
                    disabled={working}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold hover:bg-cyan-500"
                  >
                    {error ? "Rebuild mobile preview" : "Prepare preview"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-300">Ask a curator to prepare or repair this preview.</p>
                )}
              </>
            )}
          </div>
        )}
        <p className="p-4 text-xs text-slate-300">
          This is a smaller review copy. The full-quality original remains unchanged.
        </p>
      </div>
    </div>
  );
}
