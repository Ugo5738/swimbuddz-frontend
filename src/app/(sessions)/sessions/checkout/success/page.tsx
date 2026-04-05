"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { apiGet } from "@/lib/api";
import { getSession, type Session } from "@/lib/sessions";
import { ArrowRight, Calendar, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

type PaymentStatus =
  | { state: "verifying" }
  | { state: "success"; amount: number; metadata: Record<string, unknown> }
  | { state: "failed"; reason: string };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function BundleSuccessInner() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || searchParams.get("reference") || "";

  const [status, setStatus] = useState<PaymentStatus>({ state: "verifying" });
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (!reference) {
      setStatus({ state: "failed", reason: "Missing payment reference." });
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < 8) {
        attempts++;
        try {
          const res = await apiGet<{
            status: string;
            amount: number;
            payment_metadata?: { session_ids?: string[] };
          }>(`/api/v1/payments/paystack/verify/${reference}`, { auth: true });

          if (res.status === "paid") {
            const sessionIds = res.payment_metadata?.session_ids || [];
            if (sessionIds.length > 0) {
              const results = await Promise.allSettled(
                sessionIds.map((id) => getSession(id))
              );
              const loaded: Session[] = [];
              for (const r of results) {
                if (r.status === "fulfilled") loaded.push(r.value);
              }
              loaded.sort(
                (a, b) =>
                  new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
              );
              if (!cancelled) setSessions(loaded);
            }
            if (!cancelled) {
              setStatus({
                state: "success",
                amount: res.amount,
                metadata: res.payment_metadata || {},
              });
            }
            return;
          }
          if (res.status === "failed") {
            if (!cancelled) {
              setStatus({ state: "failed", reason: "Payment was not completed." });
            }
            return;
          }
        } catch {
          // keep polling
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        setStatus({
          state: "failed",
          reason: "Payment verification timed out. Check your bookings shortly.",
        });
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (status.state === "verifying") {
    return <LoadingCard text="Verifying your payment..." />;
  }

  if (status.state === "failed") {
    return (
      <div className="space-y-4">
        <Alert variant="error" title="Payment issue">
          {status.reason}
        </Alert>
        <Link href="/sessions">
          <Button variant="outline">Back to sessions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-600 p-6 text-white">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Bundle booked!</h1>
            <p className="text-sm text-emerald-50">
              {sessions.length} {sessions.length === 1 ? "session" : "sessions"} confirmed
            </p>
          </div>
        </div>
      </div>

      {/* Payment summary */}
      <Card className="p-4">
        <p className="text-sm font-semibold text-slate-900">Payment summary</p>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Amount paid</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(status.amount)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Reference</span>
            <span className="font-mono text-xs text-slate-500">{reference}</span>
          </div>
        </div>
      </Card>

      {/* Booked sessions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Your bookings</p>
        {sessions.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{s.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDateTime(s.starts_at)}
                  </span>
                  {(s.location_name || s.location) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {s.location_name || s.location}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/sessions/${s.id}/book?ride=1`}>
                <button className="text-xs font-medium text-cyan-600 hover:text-cyan-700 whitespace-nowrap">
                  Add ride share
                </button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/sessions?view=booked" className="flex-1">
          <Button variant="primary" className="w-full">
            View my bookings
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </Link>
        <Link href="/account" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function BundleSuccessPage() {
  return (
    <Suspense fallback={<LoadingCard text="Loading..." />}>
      <BundleSuccessInner />
    </Suspense>
  );
}
