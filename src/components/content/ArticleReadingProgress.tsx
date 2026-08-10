"use client";

import { Clock3 } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface ArticleReadingProgressProps {
  contentRef: RefObject<HTMLElement>;
  minutes: number;
}

export function ArticleReadingProgress({
  contentRef,
  minutes,
}: ArticleReadingProgressProps) {
  const totalMinutes = Math.max(1, Math.ceil(minutes));
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let animationFrame: number | null = null;

    const updateProgress = () => {
      animationFrame = null;

      const rect = content.getBoundingClientRect();
      const contentTop = window.scrollY + rect.top;
      const start = Math.max(0, contentTop - window.innerHeight * 0.25);
      const naturalEnd = contentTop + rect.height - window.innerHeight * 0.75;
      const end = Math.max(start + 1, naturalEnd);
      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));

      setProgressPercent(Math.round(progress * 100));
    };

    const scheduleUpdate = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updateProgress);
      }
    };

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(content);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    updateProgress();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [contentRef]);

  const progress = progressPercent / 100;
  const remainingMinutes = totalMinutes * (1 - progress);
  const label =
    progressPercent === 100
      ? "Finished reading"
      : progressPercent === 0
        ? `${totalMinutes} min read`
        : remainingMinutes < 1
          ? "< 1 min left"
          : `${Math.ceil(remainingMinutes)} min left`;

  return (
    <div className="sticky top-16 z-20 mb-6 overflow-hidden rounded-xl border border-cyan-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <Clock3 className="h-4 w-4 text-cyan-600" aria-hidden="true" />
          <span>{label}</span>
        </div>
        <span className="tabular-nums text-slate-500">{progressPercent}%</span>
      </div>
      <div
        className="h-1 bg-cyan-100"
        role="progressbar"
        aria-label="Article reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-valuetext={`${label}, ${progressPercent}% complete`}
      >
        <div
          className="h-full bg-cyan-600 transition-[width] duration-150 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
