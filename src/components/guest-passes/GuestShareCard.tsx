"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { trackGuestLink } from "@/lib/guestPasses";
import { Copy, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";

export function GuestLinkActions({
  url,
  sessionId,
  source = "admin_share",
}: {
  url: string;
  sessionId: string;
  source?: string;
}) {
  const [qr, setQr] = useState(false);
  const recordShare = () =>
    void trackGuestLink(
      sessionId,
      "share",
      source,
      new URL(url, window.location.origin).searchParams.get("campaign") || undefined
    );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      recordShare();
      toast.success("Guest booking link copied");
    } catch {
      toast.error("Select and copy the link below.");
    }
  };
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join me for a SwimBuddz swim", url });
        recordShare();
      } else {
        await copy();
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        toast.error("Could not share this link.");
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void copy()}>
          <Copy className="mr-2 h-4 w-4" />
          Copy link
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => void share()}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <a
          onClick={recordShare}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-cyan-800"
          href={`https://wa.me/?text=${encodeURIComponent(`Join me for a SwimBuddz swim: ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp
        </a>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setQr(!qr)}
          aria-expanded={qr}
        >
          <QrCode className="mr-2 h-4 w-4" />
          QR code
        </Button>
      </div>
      <input
        aria-label="Guest booking link"
        value={url}
        readOnly
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
      />
      {qr && (
        <div className="w-fit rounded-xl bg-white p-4">
          <QRCodeSVG value={url} size={180} title="Scan to book this guest swim" />
        </div>
      )}
    </div>
  );
}

export function GuestShareCard({ sessionId }: { sessionId: string }) {
  const { data, loading, error, refetch } = useApi<{ url: string | null; booking_mode?: string }>(
    `/api/v1/sessions/${sessionId}/guest-share-link`
  );
  if (loading) return null;
  if (error)
    return (
      <p className="text-sm text-slate-500">
        Guest invitation link is temporarily unavailable.{" "}
        <button type="button" onClick={refetch} className="text-cyan-700 underline">
          Try again
        </button>
      </p>
    );
  if (!data?.url) return null;
  return (
    <Card className="space-y-3 border-cyan-100 bg-cyan-50/30">
      <h2 className="font-semibold text-slate-900">
        {data.booking_mode === "settlement"
          ? "Help a guest complete their booking"
          : "Invite someone to this swim"}
      </h2>
      <p className="text-sm text-slate-600">
        {data.booking_mode === "settlement"
          ? "Know someone who joined this swim? Send them this link to register and settle their guest booking."
          : "Send them your guest link. They book and pay for their own spot, and your invitation is credited to you."}
      </p>
      <GuestLinkActions url={data.url} sessionId={sessionId} source="member_share" />
    </Card>
  );
}
