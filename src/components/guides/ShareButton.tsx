"use client";

import { trackEvent } from "@/lib/analytics";
import { Check, Share2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

type ShareButtonProps = {
  slug: string;
  title: string;
  description: string;
};

/**
 * A share button for a guide detail page. Uses the Web Share API where
 * available (mobile browsers, Safari), falling back to clipboard copy.
 * Fires a `guides_share_click` GA event with the method used.
 */
export function ShareButton({ slug, title, description }: ShareButtonProps): ReactNode {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== "undefined" ? window.location.href : `https://swimbuddz.com/guides/${slug}`;

    // Prefer native share on mobile — gives the user every WhatsApp / copy /
    // other app target their device offers.
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav?.share) {
      try {
        await nav.share({ title, text: description, url });
        trackEvent("guides_share_click", { slug, method: "native" });
        return;
      } catch {
        // User cancelled the native share sheet — fall through to clipboard.
      }
    }

    // Clipboard fallback
    try {
      await nav?.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
      trackEvent("guides_share_click", { slug, method: "clipboard" });
    } catch {
      toast.error("Couldn't copy the link — try selecting and copying it manually.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-cyan-500 hover:bg-cyan-50 hover:text-cyan-700"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Copied
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
          Share
        </>
      )}
    </button>
  );
}
