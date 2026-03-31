"use client";

import { Card } from "@/components/ui/Card";
import { downloadCardImage, quarterLabel } from "@/lib/reports";
import { Download, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ShareableCardPreviewProps = {
  year: number;
  quarter: number;
};

export function ShareableCardPreview({ year, quarter }: ShareableCardPreviewProps) {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [format, setFormat] = useState<"square" | "story">("square");
  const label = quarterLabel(year, quarter);
  const cachedBlob = useRef<Blob | null>(null);
  const cachedFormat = useRef<string>("");

  // Pre-fetch the card image when format changes
  const prefetch = useCallback(async () => {
    try {
      const blob = await downloadCardImage(year, quarter, format);
      cachedBlob.current = blob;
      cachedFormat.current = format;
    } catch {
      cachedBlob.current = null;
    }
  }, [year, quarter, format]);

  useEffect(() => {
    prefetch();
  }, [prefetch]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = cachedBlob.current && cachedFormat.current === format
        ? cachedBlob.current
        : await downloadCardImage(year, quarter, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `swimbuddz-${label.replace(" ", "-")}-${format}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      // Use pre-fetched blob if available, otherwise fetch now
      const blob = cachedBlob.current && cachedFormat.current === format
        ? cachedBlob.current
        : await downloadCardImage(year, quarter, format);

      const file = new File([blob], `swimbuddz-${label.replace(" ", "-")}.png`, {
        type: "image/png",
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `My SwimBuddz ${label} Report`,
          text: `Check out my SwimBuddz swim report for ${label}!`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Share failed:", e);
      }
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
      <div className="flex gap-2">
        <button
          onClick={() => setFormat("square")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            format === "square"
              ? "bg-cyan-100 text-cyan-700 font-medium"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Square (1:1)
        </button>
        <button
          onClick={() => setFormat("story")}
          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
            format === "story"
              ? "bg-cyan-100 text-cyan-700 font-medium"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Story (9:16)
        </button>
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
