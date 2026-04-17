"use client";

import { trackEvent } from "@/lib/analytics";
import Link from "next/link";
import type { ReactNode } from "react";

export type LinkCardProps = {
  /** Stable identifier fired as a GA event param. */
  linkId: string;
  href: string;
  emoji: string;
  label: string;
  sublabel?: string;
  external?: boolean;
  primary?: boolean;
  /** Optional extra GA params (e.g. cohort_id when the top link is dynamic). */
  trackingParams?: Record<string, string | number | boolean>;
};

/**
 * A single link row on the /links bio page.
 * Fires a `links_card_click` GA event on tap so we can see which cards drive traffic.
 */
export function LinkCard({
  linkId,
  href,
  emoji,
  label,
  sublabel,
  external,
  primary,
  trackingParams,
}: LinkCardProps): ReactNode {
  const className = [
    "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition",
    primary
      ? "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 hover:border-cyan-700"
      : "border-slate-200 bg-white text-slate-900 hover:border-cyan-500 hover:bg-cyan-50",
  ].join(" ");

  const handleClick = () => {
    trackEvent("links_card_click", {
      link_id: linkId,
      destination: href,
      primary: !!primary,
      ...trackingParams,
    });
  };

  const content = (
    <>
      <span className="text-2xl" aria-hidden="true">
        {emoji}
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        {sublabel ? (
          <span
            className={["mt-0.5 block text-xs", primary ? "text-cyan-50" : "text-slate-500"].join(
              " "
            )}
          >
            {sublabel}
          </span>
        ) : null}
      </span>
      <span aria-hidden="true" className="text-lg">
        ›
      </span>
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {content}
    </Link>
  );
}
