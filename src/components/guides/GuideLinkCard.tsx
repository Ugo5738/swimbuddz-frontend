"use client";

import type { GuideMeta } from "@/content/guides/manifest";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import type { ReactNode } from "react";

type GuideLinkCardProps = {
  guide: GuideMeta;
};

/**
 * A single guide card on the /guides index.
 * Mirrors the visual style of LinkCard on /links but with a description line
 * below the title. Fires a `guides_card_click` GA event on tap.
 */
export function GuideLinkCard({ guide }: GuideLinkCardProps): ReactNode {
  const handleClick = () => {
    trackEvent("guides_card_click", {
      slug: guide.slug,
      audience: guide.audience,
    });
  };

  return (
    <Link
      href={`/guides/${guide.slug}`}
      onClick={handleClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-cyan-500 hover:bg-cyan-50"
    >
      <span className="text-2xl leading-none" aria-hidden="true">
        {guide.emoji}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-slate-900">{guide.title}</span>
        <span className="mt-1 block text-xs text-slate-500">{guide.description}</span>
      </span>
      <span aria-hidden="true" className="self-center text-lg text-slate-400">
        ›
      </span>
    </Link>
  );
}
