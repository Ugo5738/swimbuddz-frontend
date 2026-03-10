"use client";

import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { Loader2, Music, Pause, Play, Search, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioTrack = {
  id: string;
  title: string;
  artist: string | null;
  file_url: string;
  duration_seconds: number | null;
  genre: string | null;
  license_type: string;
  is_active: boolean;
};

type AudioOverlayPanelProps = {
  /** The media item ID (video) to apply audio to */
  mediaId: string;
  /** Callback when audio has been applied successfully */
  onApplied?: () => void;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AudioOverlayPanel({ mediaId, onApplied }: AudioOverlayPanelProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [volumeMix, setVolumeMix] = useState(1.0);
  const [startOffset, setStartOffset] = useState(0);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch audio tracks with debounced search
  const fetchTracks = useCallback(async (query: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (query) params.set("search", query);

      const data = await apiGet<AudioTrack[]>(`/api/v1/media/audio-tracks?${params.toString()}`, {
        auth: true,
      });
      setTracks(data);
    } catch (err) {
      console.error("Failed to fetch audio tracks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTracks("");
  }, [fetchTracks]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchTracks(searchQuery);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, fetchTracks]);

  // Preview track audio
  const togglePreview = (track: AudioTrack) => {
    if (previewingTrackId === track.id) {
      // Stop preview
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPreviewingTrackId(null);
    } else {
      // Start preview
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(track.file_url);
      audio.volume = 0.5;
      audio.play().catch(() => {});
      audio.addEventListener("ended", () => setPreviewingTrackId(null));
      audioRef.current = audio;
      setPreviewingTrackId(track.id);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Apply audio to video
  const handleApplyAudio = async () => {
    if (!selectedTrack) return;

    try {
      setApplying(true);
      setError(null);
      setSuccess(false);

      await apiPost(
        `/api/v1/media/videos/${mediaId}/apply-audio`,
        {
          audio_track_id: selectedTrack.id,
          volume_mix: volumeMix,
          start_offset_seconds: startOffset,
        },
        { auth: true }
      );

      setSuccess(true);
      onApplied?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply audio. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Music className="h-5 w-5 text-cyan-600" />
        <h3 className="font-semibold text-slate-900">Audio Overlay</h3>
      </div>

      <p className="text-sm text-slate-500">
        Replace or mix the video&apos;s audio with a track from the library.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search tracks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
        />
      </div>

      {/* Track list */}
      <div className="max-h-48 overflow-y-auto space-y-0 border rounded-lg divide-y divide-slate-100">
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">
            No audio tracks available.
            {searchQuery && " Try a different search."}
          </div>
        ) : (
          tracks.map((track) => (
            <div
              key={track.id}
              onClick={() => setSelectedTrack(track)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 cursor-pointer ${
                selectedTrack?.id === track.id ? "bg-cyan-50 border-l-2 border-l-cyan-500" : ""
              }`}
            >
              {/* Preview button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePreview(track);
                }}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  previewingTrackId === track.id
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {previewingTrackId === track.id ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 ml-0.5" />
                )}
              </button>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{track.title}</p>
                <p className="text-xs text-slate-500 truncate">
                  {track.artist || "Unknown artist"}
                  {track.genre && ` \u00B7 ${track.genre}`}
                </p>
              </div>

              {/* Duration */}
              <span className="flex-shrink-0 text-xs text-slate-400 font-mono">
                {formatDuration(track.duration_seconds)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Volume mix slider */}
      {selectedTrack && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Selected: {selectedTrack.title}
            </span>
          </div>

          {/* Volume control */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                {volumeMix >= 0.99 ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
                Audio Mix
              </label>
              <span className="text-xs text-slate-500">
                {volumeMix >= 0.99
                  ? "Replace audio"
                  : volumeMix <= 0.01
                    ? "Keep original"
                    : `${Math.round(volumeMix * 100)}% track / ${Math.round((1 - volumeMix) * 100)}% original`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volumeMix}
              onChange={(e) => setVolumeMix(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Keep original</span>
              <span>Mix</span>
              <span>Replace</span>
            </div>
          </div>

          {/* Start offset */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-600">Audio Start Offset</label>
              <span className="text-xs text-slate-500 font-mono">{startOffset}s</span>
            </div>
            <input
              type="range"
              min="0"
              max={selectedTrack.duration_seconds || 60}
              step="1"
              value={startOffset}
              onChange={(e) => setStartOffset(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-cyan-600"
            />
          </div>

          {/* Apply button */}
          <button
            type="button"
            onClick={handleApplyAudio}
            disabled={applying}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-cyan-500 text-white text-sm font-semibold hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Music className="h-4 w-4" />
                Apply Audio
              </>
            )}
          </button>

          {/* Status messages */}
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              Audio overlay is being processed. The video will update automatically when processing
              is complete.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
