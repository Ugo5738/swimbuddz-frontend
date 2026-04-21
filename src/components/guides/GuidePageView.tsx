"use client";

import type { GuideAudience } from "@/content/guides/manifest";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";

type GuidePageViewProps = {
  slug: string;
  audience: GuideAudience;
};

/**
 * Fires a `guides_page_view` GA event once per mount. Used on guide detail
 * pages so we can see which guides get read (vs. just clicked).
 *
 * Rendered as a zero-output component so it can sit inside server-rendered pages.
 */
export function GuidePageView({ slug, audience }: GuidePageViewProps): null {
  useEffect(() => {
    trackEvent("guides_page_view", { slug, audience });
    // Run once per mount — slug/audience don't change within a page lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
