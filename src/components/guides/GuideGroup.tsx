import { GuideLinkCard } from "@/components/guides/GuideLinkCard";
import { AUDIENCE_LABELS, type GuideAudience, type GuideMeta } from "@/content/guides/manifest";
import type { ReactNode } from "react";

type GuideGroupProps = {
  audience: GuideAudience;
  guides: GuideMeta[];
};

/**
 * Renders one audience group on the /guides index page —
 * a labeled heading followed by a stack of guide cards.
 */
export function GuideGroup({ audience, guides }: GuideGroupProps): ReactNode {
  return (
    <section className="w-full">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {AUDIENCE_LABELS[audience]}
      </h2>
      <div className="flex flex-col gap-3">
        {guides.map((guide) => (
          <GuideLinkCard key={guide.slug} guide={guide} />
        ))}
      </div>
    </section>
  );
}
