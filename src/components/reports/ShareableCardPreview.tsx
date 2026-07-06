"use client";

import { Card } from "@/components/ui/Card";
import { type CardImageFormat, downloadCardImage, quarterLabel } from "@/lib/reports";
import { Download, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ShareableCardPreviewProps = {
  year: number;
  quarter: number;
};

const FORMAT_OPTIONS: { value: CardImageFormat; label: string }[] = [
  { value: "post", label: "Post (4:5)" },
  { value: "square", label: "Square (1:1)" },
  { value: "story", label: "Story (9:16)" },
];

const OBJECT_URL_REVOKE_DELAY_MS = 60_000;

type ShareResult = "shared" | "unsupported" | "aborted" | "failed";

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function cardFilename(label: string, format: CardImageFormat): string {
  return `swimbuddz-${label.replace(/\s+/g, "-")}-${format}.png`;
}

function cardFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function canShareCardFile(file: File): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function shareCardFile(file: File, label: string): Promise<ShareResult> {
  if (!canShareCardFile(file)) return "unsupported";

  try {
    await navigator.share({
      title: `My SwimBuddz ${label} Report`,
      text: `Check out my SwimBuddz swim report for ${label}!`,
      files: [file],
    });
    return "shared";
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return "aborted";
    console.error("Share failed:", e);
    return "failed";
  }
}

function openBlobInBrowser(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");

  if (opened) {
    window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
    return;
  }

  window.location.assign(url);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_REVOKE_DELAY_MS);
}

export function ShareableCardPreview({ year, quarter }: ShareableCardPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [format, setFormat] = useState<CardImageFormat>("post");
  const label = quarterLabel(year, quarter);
  const cachedBlob = useRef<Blob | null>(null);
  const cachedKey = useRef<string>("");
  const currentCacheKey = `${year}-${quarter}-${format}`;

  // Pre-fetch the card image when format changes
  const prefetch = useCallback(async () => {
    try {
      const blob = await downloadCardImage(year, quarter, format);
      cachedBlob.current = blob;
      cachedKey.current = currentCacheKey;
    } catch {
      cachedBlob.current = null;
    }
  }, [year, quarter, format, currentCacheKey]);

  const getCardBlob = useCallback(async () => {
    return cachedBlob.current && cachedKey.current === currentCacheKey
      ? cachedBlob.current
      : downloadCardImage(year, quarter, format);
  }, [year, quarter, format, currentCacheKey]);

  useEffect(() => {
    prefetch();
  }, [prefetch]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await getCardBlob();
      const filename = cardFilename(label, format);

      if (isIOSDevice()) {
        const shareResult = await shareCardFile(cardFile(blob, filename), label);
        if (shareResult === "shared" || shareResult === "aborted") return;

        openBlobInBrowser(blob);
        return;
      }

      downloadBlob(blob, filename);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await getCardBlob();
      const filename = cardFilename(label, format);
      const shareResult = await shareCardFile(cardFile(blob, filename), label);

      if (shareResult === "unsupported" || shareResult === "failed") {
        if (isIOSDevice()) {
          openBlobInBrowser(blob);
        } else {
          downloadBlob(blob, filename);
        }
      }
    } catch (e) {
      console.error("Share failed:", e);
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Share Your Report</h3>
          <p className="text-sm text-slate-500">Download or share your SwimBuddz Wrapped card</p>
        </div>
      </div>

      {/* Format selector */}
      <div className="flex flex-wrap gap-2">
        {FORMAT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFormat(option.value)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              format === option.value
                ? "bg-cyan-100 text-cyan-700 font-medium"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Downloading..." : "Download"}
        </button>
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" />
          {sharing ? "Sharing..." : "Share"}
        </button>
      </div>
    </Card>
  );
}
