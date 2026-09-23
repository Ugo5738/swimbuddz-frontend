"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { useGuestCapability } from "@/hooks/useGuestCapability";
import { apiPost } from "@/lib/api";
import { GuestPassReceipt } from "@/lib/guestPasses";
import { formatCurrency } from "@/lib/upgradeContext";
import { CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function GuestPassReceiptPage() {
  const { guestPassId } = useParams<{ guestPassId: string }>();
  const capability = useGuestCapability(`guest-receipt:${guestPassId}`);
  const receipt = useApi<GuestPassReceipt>(`/api/v1/guest-passes/${guestPassId}`, {
    auth: false,
    enabled: capability.ready,
    headers: { "X-Guest-Pass-Token": capability.token },
  });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pass = receipt.data;
  const confirmed = !!pass && ["confirmed", "attended"].includes(pass.status);
  const failed = pass?.status === "payment_failed";
  const settlement =
    pass?.booking_mode === "settlement" ||
    (!!pass?.starts_at && new Date(pass.starts_at).getTime() <= Date.now());
  const expired =
    !!pass?.reservation_expires_at && new Date(pass.reservation_expires_at) <= new Date();
  const { refetch } = receipt;
  const shouldPoll = !!pass && pass.status === "pending_payment";
  useEffect(() => {
    if (!shouldPoll) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      if (++attempts <= 12) refetch();
      else window.clearInterval(timer);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [guestPassId, shouldPoll, refetch]);

  const resume = async () => {
    setPaying(true);
    setError(null);
    try {
      const next = await apiPost<GuestPassReceipt>(
        `/api/v1/guest-passes/${guestPassId}/checkout`,
        {},
        {
          auth: false,
          headers: { "X-Guest-Pass-Token": capability.token },
        }
      );
      if (next.checkout_url) window.location.assign(next.checkout_url);
      else {
        refetch();
        if (next.status === "payment_failed")
          setError("Payment is temporarily unavailable. Please try again.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resume payment.");
    } finally {
      setPaying(false);
    }
  };

  if (!capability.ready || (receipt.loading && !pass))
    return <LoadingCard text="Checking your guest booking..." />;
  if (!pass) return <Alert variant="error">{receipt.error || "Guest pass not found."}</Alert>;
  const date = pass.starts_at
    ? new Date(pass.starts_at).toLocaleString("en-NG", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: pass.timezone,
      })
    : "";
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-10">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${confirmed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-700"}`}
      >
        {confirmed ? <CheckCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">
          {confirmed
            ? settlement
              ? "Your guest booking is recorded"
              : "Your guest swim is confirmed"
            : failed
              ? "Payment needs another try"
              : "Awaiting payment confirmation"}
        </h1>
        <p className="mt-2 text-slate-600">
          {confirmed
            ? "Your booking details and receipt are below."
            : pass.payment_method === "manual_transfer"
              ? "Your booking is confirmed after the team verifies your bank transfer."
              : "Payment confirmation may take a moment."}
        </p>
      </div>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">{pass.session_title || "SwimBuddz guest swim"}</h2>
        <p className="text-sm text-slate-600">{date}</p>
        <p className="text-sm text-slate-600">
          {pass.location_name || "Private venue details are shared in your confirmation email."}
          {pass.location_address ? ` · ${pass.location_address}` : ""}
        </p>
        <dl className="space-y-3 border-t border-slate-100 pt-3 text-sm">
          <div>
            <dt className="text-slate-500">Booking reference</dt>
            <dd className="break-all font-mono">{pass.payment_reference}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Guest rate</dt>
            <dd>{formatCurrency(pass.price_kobo / 100)}</dd>
          </div>
          {pass.additional_charges.map((charge, i) => (
            <div key={`${charge.label}-${i}`} className="flex justify-between">
              <dt>{charge.label}</dt>
              <dd>{formatCurrency(charge.amount_kobo / 100)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-3 font-bold">
            <dt>{confirmed ? "Total paid" : "Total"}</dt>
            <dd>{formatCurrency(pass.total_kobo / 100)}</dd>
          </div>
        </dl>
      </Card>
      {confirmed ? (
        <Card className="space-y-3">
          {settlement ? (
            <p className="text-sm text-slate-700">
              {pass.attendance_recorded
                ? "Your attendance has been recorded by the team."
                : "Payment is complete. Attendance is confirmed separately by the team."}
            </p>
          ) : (
            <>
              <h2 className="font-semibold">Before your swim</h2>
              <p className="text-sm text-slate-700">
                Arrive 15 minutes early with your reference, swimwear, swim cap, goggles, towel and
                water. Follow pool safety instructions and tell your coach your swimming experience.
              </p>
            </>
          )}
          <p className="text-sm text-slate-600">
            Keep this private booking link for your records. Need help? Contact SwimBuddz.
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-medium text-cyan-700">
            <Link href="/sessions">Find another swim</Link>
            <Link href="/academy">Explore Academy</Link>
            <Link href="/club">Explore Club</Link>
            <Link href="/join">Join the community</Link>
          </div>
        </Card>
      ) : (
        <>
          {expired && (
            <Alert>
              Your reservation hold has expired. Contact SwimBuddz before making another payment. An
              uploaded receipt does not extend a hold.
            </Alert>
          )}
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-wrap gap-3">
            {capability.token && !expired && (
              <Button disabled={paying} onClick={() => void resume()}>
                {paying
                  ? "Opening payment..."
                  : pass.payment_method === "manual_transfer"
                    ? "Bank details / upload receipt"
                    : "Continue payment"}
              </Button>
            )}
            <Button variant="secondary" onClick={refetch} disabled={receipt.loading}>
              Refresh status
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
