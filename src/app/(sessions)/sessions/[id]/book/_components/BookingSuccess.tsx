import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Session } from "@/lib/sessions";
import Link from "next/link";

type BookingSuccessProps = {
  session: Session;
  /** Itemized payment breakdown (optional — shown only if provided). */
  breakdown?: {
    poolFee?: number;
    rideShareFee?: number;
    discountAmount?: number;
    discountCode?: string;
    bubblesApplied?: number;
    paystackAmount?: number;
    total: number;
    reference?: string;
  };
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function BookingSuccess({ session, breakdown }: BookingSuccessProps) {
  const startsAt = new Date(session.starts_at);
  const formattedDate = startsAt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const startTime = startsAt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = new Date(session.ends_at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-emerald-600">You&apos;re confirmed!</h1>
          <p className="text-lg font-semibold text-slate-900">{session.title}</p>
          <p className="text-slate-600">
            {session.location_name ?? session.location} — {formattedDate}, {startTime}–{endTime}
          </p>
        </div>

        <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-emerald-500">✓</span>
            <div>
              <p className="font-semibold text-emerald-900">Booking confirmed</p>
              <p className="text-sm text-emerald-700">Your attendance has been recorded.</p>
            </div>
          </div>
        </div>

        {/* Itemized payment breakdown */}
        {breakdown && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900 mb-3">Payment summary</p>
            <div className="space-y-1.5 text-sm">
              {typeof breakdown.poolFee === "number" && breakdown.poolFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Pool fee</span>
                  <span className="text-slate-900">{formatCurrency(breakdown.poolFee)}</span>
                </div>
              )}
              {typeof breakdown.rideShareFee === "number" && breakdown.rideShareFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Ride share</span>
                  <span className="text-slate-900">{formatCurrency(breakdown.rideShareFee)}</span>
                </div>
              )}
              {typeof breakdown.discountAmount === "number" && breakdown.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount{breakdown.discountCode ? ` (${breakdown.discountCode})` : ""}
                  </span>
                  <span>-{formatCurrency(breakdown.discountAmount)}</span>
                </div>
              )}
              {typeof breakdown.bubblesApplied === "number" && breakdown.bubblesApplied > 0 && (
                <div className="flex justify-between text-cyan-700">
                  <span>🫧 Bubbles applied</span>
                  <span>
                    {breakdown.bubblesApplied} · -
                    {formatCurrency(breakdown.bubblesApplied * 100)}
                  </span>
                </div>
              )}
              {typeof breakdown.paystackAmount === "number" && breakdown.paystackAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid via card/bank</span>
                  <span className="text-slate-900">
                    {formatCurrency(breakdown.paystackAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">{formatCurrency(breakdown.total)}</span>
              </div>
              {breakdown.reference && (
                <div className="pt-2 text-xs text-slate-500">
                  Ref:{" "}
                  <span className="font-mono">{breakdown.reference}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/account">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
          <Link href="/sessions">
            <Button variant="secondary" className="w-full">
              View All Sessions
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
