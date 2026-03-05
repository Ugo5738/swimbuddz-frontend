"use client";

import { Card } from "@/components/ui/Card";
import { ShareButton } from "@/components/wallet/ShareButton";
import { Check, Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type ReferralCodeCardProps = {
  code: string;
  shareUrl: string;
};

export function ReferralCodeCard({ code, shareUrl }: ReferralCodeCardProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copyToClipboard = useCallback(async (text: string, type: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(type === "code" ? "Code copied!" : "Link copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  return (
    <Card className="p-5 md:p-6 bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
      <p className="text-sm font-medium text-cyan-100 mb-1">Your Referral Code</p>
      <div className="flex items-center gap-3 mb-4">
        <p className="text-3xl md:text-4xl font-bold font-mono tracking-wider">{code}</p>
        <button
          onClick={() => copyToClipboard(code, "code")}
          className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition"
          title="Copy code"
        >
          {copied === "code" ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4 bg-white/10 rounded-lg px-3 py-2">
        <p className="text-sm truncate flex-1 text-cyan-50">{shareUrl}</p>
        <button
          onClick={() => copyToClipboard(shareUrl, "link")}
          className="p-1.5 rounded bg-white/20 hover:bg-white/30 transition shrink-0"
          title="Copy link"
        >
          {copied === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <ShareButton
        code={code}
        shareUrl={shareUrl}
        triggerRewardEvent
        className="[&_button]:bg-white [&_button]:text-blue-600 [&_button]:hover:bg-blue-50 [&_button]:border-0"
      />
    </Card>
  );
}
