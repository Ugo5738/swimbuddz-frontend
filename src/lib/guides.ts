/**
 * Server-only utilities for loading /guides content.
 *
 * Guides are static markdown files registered in src/content/guides/manifest.ts.
 * We read them from disk at build time (via generateStaticParams) — no runtime
 * content fetch, no CMS.
 */

import { GUIDES, type GuideAudience, type GuideMeta } from "@/content/guides/manifest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "src", "content", "guides");

export type LoadedGuide = {
  meta: GuideMeta;
  content: string;
};

/** Return all registered guides, sorted by audience then order. */
export function getAllGuides(): GuideMeta[] {
  return [...GUIDES].sort((a, b) => {
    if (a.audience !== b.audience) return a.audience.localeCompare(b.audience);
    return a.order - b.order;
  });
}

/**
 * Load a single guide by slug. Returns null when the slug isn't registered
 * so callers can trigger notFound() without throwing.
 */
export async function getGuideBySlug(slug: string): Promise<LoadedGuide | null> {
  const meta = GUIDES.find((g) => g.slug === slug);
  if (!meta) return null;

  try {
    const content = await readFile(path.join(CONTENT_DIR, meta.file), "utf-8");
    return { meta, content };
  } catch {
    // File missing on disk — treat as not-found rather than 500ing.
    return null;
  }
}

/**
 * Group guides by audience, preserving audience ordering from AUDIENCE_LABELS
 * and the per-guide `order` within each group.
 */
export function groupGuidesByAudience(
  guides: GuideMeta[]
): Array<{ audience: GuideAudience; guides: GuideMeta[] }> {
  const audiences: GuideAudience[] = ["volunteers", "members", "coaches", "partners"];
  return audiences
    .map((audience) => ({
      audience,
      guides: guides.filter((g) => g.audience === audience).sort((a, b) => a.order - b.order),
    }))
    .filter((group) => group.guides.length > 0);
}
