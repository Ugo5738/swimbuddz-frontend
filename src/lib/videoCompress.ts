/**
 * Client-side video downscale + re-encode, so a 4K phone clip (often
 * 60-200 MB) becomes a few MB before it ever leaves the device.
 *
 * Why this exists: the analysis pipeline downscales every frame to 1280px
 * for inference anyway, so uploading 4K is wasted bytes + wasted upload
 * time on Lagos mobile data. We do the downscale here, in the browser,
 * using only native APIs (canvas + MediaRecorder) — no ffmpeg.wasm
 * payload to ship to a mid-range Android.
 *
 * Strategy: draw the playing <video> onto a downscaled <canvas> and record
 * the canvas stream with MediaRecorder. Recording is real-time (a 20s clip
 * takes ~20s), so we report progress. Audio is dropped (captureStream is
 * video-only) — the analysis never uses it.
 *
 * Graceful degradation: if MediaRecorder is unavailable or anything throws,
 * we return the original file with skipped=true and let the caller decide
 * (it'll hit the server's size cap with a clear message).
 */

export type CompressResult = {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  skipped: boolean;
  reason?: string;
};

export type CompressOptions = {
  /** Longest output side in px. Matches the pipeline's inference width. */
  maxLongSide?: number;
  /** Target video bitrate. ~2.5 Mbps @720p is a good quality/size trade. */
  videoBitsPerSecond?: number;
  /** Files already this small skip compression (avoids needless quality loss). */
  skipIfUnderBytes?: number;
  /** 0..1 progress while recording. */
  onProgress?: (fraction: number) => void;
};

const DEFAULTS = {
  // 1080p, not 720p: the analysis crops to the swimmer (a small slice of the
  // frame) and runs pose on that crop at source resolution, so spatial detail
  // here directly drives pose-detection accuracy. 1080p keeps the crop sharp
  // while still shrinking a 60-200 MB 4K clip to ~10-30 MB. Bitrate reduction
  // (4K phones shoot ~50 Mbps) does most of the size work; resolution does the
  // rest. Raising this further has diminishing returns — the pipeline only
  // needs ~1280px of swimmer to detect pose well.
  maxLongSide: 1920,
  videoBitsPerSecond: 4_000_000,
  skipIfUnderBytes: 8 * 1024 * 1024,
};

/** Pick the best MediaRecorder mime the browser supports. Returns the
 * recorder mime (may include codecs) and the clean base mime we tag the
 * output File with (Supabase bucket allow-list matches the base). */
function pickMime(): { recorderMime: string; baseMime: string } | null {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof MediaRecorder.isTypeSupported !== "function"
  ) {
    return null;
  }
  const candidates: Array<{ recorderMime: string; baseMime: string }> = [
    { recorderMime: "video/mp4;codecs=h264", baseMime: "video/mp4" },
    { recorderMime: "video/mp4", baseMime: "video/mp4" },
    { recorderMime: "video/webm;codecs=vp9", baseMime: "video/webm" },
    { recorderMime: "video/webm;codecs=vp8", baseMime: "video/webm" },
    { recorderMime: "video/webm", baseMime: "video/webm" },
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c.recorderMime)) return c;
  }
  return null;
}

function evenDims(
  w: number,
  h: number,
  maxLongSide: number,
): { width: number; height: number } {
  const longSide = Math.max(w, h);
  const scale = longSide > maxLongSide ? maxLongSide / longSide : 1;
  // H.264 / VP codecs want even dimensions.
  const width = Math.max(2, Math.round((w * scale) / 2) * 2);
  const height = Math.max(2, Math.round((h * scale) / 2) * 2);
  return { width, height };
}

function swapExtension(name: string, baseMime: string): string {
  const ext = baseMime === "video/mp4" ? "mp4" : "webm";
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return `${stem}.${ext}`;
}

export async function compressVideoForUpload(
  input: File,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const opts = { ...DEFAULTS, ...options };
  const originalBytes = input.size;

  // Already small enough — don't recompress (avoids generation loss).
  if (originalBytes <= opts.skipIfUnderBytes) {
    return {
      file: input,
      originalBytes,
      compressedBytes: originalBytes,
      width: 0,
      height: 0,
      skipped: true,
      reason: "already-small",
    };
  }

  const mime = pickMime();
  if (!mime) {
    return {
      file: input,
      originalBytes,
      compressedBytes: originalBytes,
      width: 0,
      height: 0,
      skipped: true,
      reason: "mediarecorder-unsupported",
    };
  }

  try {
    return await runCompression(input, mime, opts, originalBytes);
  } catch (err) {
    // Any failure → fall back to the original; the caller surfaces the
    // server's size limit if it's still too big.
    return {
      file: input,
      originalBytes,
      compressedBytes: originalBytes,
      width: 0,
      height: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : "compression-failed",
    };
  }
}

function runCompression(
  input: File,
  mime: { recorderMime: string; baseMime: string },
  opts: Required<Pick<CompressOptions, "maxLongSide" | "videoBitsPerSecond">> &
    CompressOptions,
  originalBytes: number,
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(input);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    let recorder: MediaRecorder | null = null;
    let rafId = 0;
    let settled = false;
    const chunks: BlobPart[] = [];

    const cleanup = () => {
      cancelAnimationFrame(rafId);
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* ignore */
      }
    };

    const fail = (e: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(e instanceof Error ? e : new Error(String(e)));
    };

    video.onerror = () => fail(new Error("Could not decode the selected video"));

    video.onloadedmetadata = () => {
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      if (!srcW || !srcH) {
        fail(new Error("Video has no dimensions"));
        return;
      }
      const { width, height } = evenDims(srcW, srcH, opts.maxLongSide);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        fail(new Error("Canvas 2D unavailable"));
        return;
      }

      const stream = canvas.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: mime.recorderMime,
        videoBitsPerSecond: opts.videoBitsPerSecond,
      });
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };
      recorder.onstop = () => {
        if (settled) return;
        settled = true;
        cleanup();
        const blob = new Blob(chunks, { type: mime.baseMime });
        const file = new File(
          [blob],
          swapExtension(input.name, mime.baseMime),
          { type: mime.baseMime },
        );
        resolve({
          file,
          originalBytes,
          compressedBytes: file.size,
          width,
          height,
          skipped: false,
        });
      };
      recorder.onerror = () => fail(new Error("Recorder error"));

      const duration = Number.isFinite(video.duration) ? video.duration : 0;

      const drawLoop = () => {
        if (settled) return;
        ctx.drawImage(video, 0, 0, width, height);
        if (duration > 0 && opts.onProgress) {
          opts.onProgress(Math.min(1, video.currentTime / duration));
        }
        rafId = requestAnimationFrame(drawLoop);
      };

      video.onended = () => {
        cancelAnimationFrame(rafId);
        opts.onProgress?.(1);
        // Flush the last frame, then stop on the next tick.
        try {
          ctx.drawImage(video, 0, 0, width, height);
        } catch {
          /* ignore */
        }
        recorder?.stop();
      };

      recorder.start(250); // gather chunks periodically
      video
        .play()
        .then(() => {
          rafId = requestAnimationFrame(drawLoop);
        })
        .catch((e) => fail(e));
    };
  });
}
