"use client";

import { AudioOverlayPanel } from "@/components/media/AudioOverlayPanel";
import { MediaInput } from "@/components/ui/MediaInput";
import { toast } from "sonner";

import type { ProductVideo } from "../types";

type Props = {
  videos: ProductVideo[];
  showVideoForm: boolean;
  setShowVideoForm: (value: boolean) => void;
  savingVideo: boolean;
  deletingVideoId: string | null;
  audioOverlayVideoId: string | null;
  setAudioOverlayVideoId: (id: string | null) => void;
  onVideoUploaded: (mediaId: string | null, fileUrl?: string) => Promise<void>;
  onDeleteVideo: (videoId: string) => Promise<void>;
};

export function VideosCard({
  videos,
  showVideoForm,
  setShowVideoForm,
  savingVideo,
  deletingVideoId,
  audioOverlayVideoId,
  setAudioOverlayVideoId,
  onVideoUploaded,
  onDeleteVideo,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Videos <span className="text-slate-400 font-normal">({videos.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowVideoForm(!showVideoForm)}
          className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
        >
          {showVideoForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add Video via MediaInput */}
      {showVideoForm && (
        <div className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg">
          {savingVideo ? (
            <p className="text-sm text-slate-500 text-center py-2">Saving to product...</p>
          ) : (
            <MediaInput
              purpose="product_video"
              mode="both"
              onChange={onVideoUploaded}
              showPreview={false}
            />
          )}
        </div>
      )}

      {/* Existing Videos */}
      {videos.length === 0 ? (
        <p className="text-sm text-slate-500">No videos yet. Add product demos or features.</p>
      ) : (
        <div className="space-y-3">
          {videos.map((vid) => (
            <div key={vid.id} className="space-y-2">
              <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  src={vid.url}
                  className="w-full aspect-video object-cover bg-black"
                  controls
                  preload="metadata"
                />
                {!vid.is_processed && (
                  <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 bg-amber-500 text-white rounded font-medium">
                    Processing...
                  </span>
                )}
                {vid.title && (
                  <p className="px-2 py-1 text-xs text-slate-600 truncate">{vid.title}</p>
                )}
                <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {vid.is_processed && vid.media_item_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setAudioOverlayVideoId(audioOverlayVideoId === vid.id ? null : vid.id)
                      }
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-xs transition-colors ${
                        audioOverlayVideoId === vid.id
                          ? "bg-cyan-500 text-white"
                          : "bg-slate-700/70 text-white hover:bg-cyan-600"
                      }`}
                      title="Audio overlay"
                    >
                      ♫
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteVideo(vid.id)}
                    disabled={deletingVideoId === vid.id}
                    className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600 disabled:opacity-50"
                    title="Remove video"
                  >
                    {deletingVideoId === vid.id ? "..." : "×"}
                  </button>
                </div>
              </div>

              {/* Audio overlay panel for this video */}
              {audioOverlayVideoId === vid.id && vid.media_item_id && (
                <AudioOverlayPanel
                  mediaId={vid.media_item_id}
                  onApplied={() => {
                    toast.success("Audio overlay queued for processing");
                    setAudioOverlayVideoId(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
