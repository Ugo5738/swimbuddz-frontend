"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

interface ArticleReadingProgressProps {
  contentRef: RefObject<HTMLElement>;
  minutes: number;
}

export function ArticleReadingProgress({ contentRef, minutes }: ArticleReadingProgressProps) {
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

  const remainingMinutes = totalMinutes * (1 - progressPercent / 100);
  const remainingLabel =
    progressPercent >= 100
      ? "Done"
      : remainingMinutes < 1
        ? "< 1 min left"
        : `${Math.ceil(remainingMinutes)} min left`;

  return (
    <div
      className="sticky top-16 z-20 mb-6 flex items-center gap-3 rounded-full bg-white/90 px-3 py-2 shadow-sm backdrop-blur"
      role="progressbar"
      aria-label="Article reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progressPercent}
      aria-valuetext={remainingLabel}
    >
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-cyan-100/90">
        <div
          className="h-full rounded-full bg-cyan-600 transition-[width] duration-150 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
        {remainingLabel}
      </span>
    </div>
  );
}
