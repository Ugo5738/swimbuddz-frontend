"use client";

import { Button } from "@/components/ui/Button";
import { apiPost } from "@/lib/api";
import { Copy, MessageCircle, Share2, Twitter } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type ShareButtonProps = {
  code: string;
  shareUrl: string;
  /** Whether to trigger a content.share reward event after sharing */
  triggerRewardEvent?: boolean;
  className?: string;
};

const SHARE_COOLDOWN_KEY = "swimbuddz_share_cooldown";

function canTriggerReward(): boolean {
  try {
    const last = localStorage.getItem(SHARE_COOLDOWN_KEY);
    if (!last) return true;
    // 1-hour cooldown per session
    return Date.now() - Number(last) > 3_600_000;
  } catch {
    return true;
  }
}

function markShareTriggered() {
  try {
    localStorage.setItem(SHARE_COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export function ShareButton({
  code,
  shareUrl,
  triggerRewardEvent = true,
  className,
}: ShareButtonProps) {
  const [showOptions, setShowOptions] = useState(false);

  const triggerReward = useCallback(async () => {
    if (!triggerRewardEvent || !canTriggerReward()) return;
    try {
      await apiPost(
        "/api/v1/wallet/rewards/events",
        { event_type: "content.share" },
        { auth: true }
      );
      markShareTriggered();
      toast.success("Thanks for sharing! You earned 2 🫧");
    } catch {
      // Silently fail — reward is a bonus
    }
  }, [triggerRewardEvent]);

  const handleNativeShare = useCallback(async () => {
    const shareData = {
      title: "Join SwimBuddz!",
      text: `Join SwimBuddz and we both earn Bubbles! Use my referral code: ${code}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        triggerReward();
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          setShowOptions(true);
        }
      }
    } else {
      setShowOptions(true);
    }
  }, [code, shareUrl, triggerReward]);

  const handleWhatsApp = () => {
    const text = `Join SwimBuddz and we both earn Bubbles! Use my referral code: ${code}\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    setShowOptions(false);
    triggerReward();
  };

  const handleTwitter = () => {
    const text = `Join me on @SwimBuddz! Use my referral code ${code} and we both earn Bubbles 🫧`;
    window.open(
      `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank"
    );
    setShowOptions(false);
    triggerReward();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
      setShowOptions(false);
      triggerReward();
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={`relative ${className || ""}`}>
      <Button onClick={handleNativeShare} size="sm" variant="outline">
        <Share2 className="h-4 w-4 mr-1.5" />
        Share
      </Button>

      {showOptions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
          <div className="absolute top-full mt-1 right-0 z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[180px]">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp
            </button>
            <button
              onClick={handleTwitter}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Twitter className="h-4 w-4 text-sky-500" />X (Twitter)
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4 text-slate-500" />
              Copy Link
            </button>
          </div>
        </>
      )}
    </div>
  );
}
