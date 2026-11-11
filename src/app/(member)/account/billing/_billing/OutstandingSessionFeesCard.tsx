"use client";

import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";

import type { PaymentRecord } from "../types";
import { formatCurrency } from "../utils";

// Mirrors UnpaidBookingResponse on the backend
// (services/sessions_service/schemas/booking.py).
type UnpaidBooking = {
  id: string;
  session_id: string;
  session_title: string;
  session_starts_at: string;
  session_ends_at: string;
  fee_amount_kobo: number;
  channel: string;
  booked_at: string;
  notes?: string | null;
};

function formatWhen(starts: string): string {
  const d = new Date(starts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OutstandingSessionFeesCard({ payments = [] }: { payments?: PaymentRecord[] }) {
  const { data: bookings, error } = useApi<UnpaidBooking[]>("/api/v1/sessions/bookings/me/unpaid");
  if (error)
    return <p className="text-sm text-rose-600">Could not load outstanding session fees.</p>;
  if (!bookings || bookings.length === 0) return null;

  const openForBooking = (bookingId: string) =>
    payments.find(
      (p) =>
        (p.status === "pending" || p.status === "pending_review") &&
        (p.session_booking_id === bookingId || p.payment_metadata?.booking_id === bookingId),
    );

  return (
    <Card className="p-4 md:p-6 space-y-3 md:space-y-4 border-rose-200 bg-rose-50">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-rose-900">
          🏊 Outstanding session fees
        </h2>
        <p className="text-xs md:text-sm text-rose-700 mt-0.5 md:mt-1">
          You attended these sessions without paying online. Settle them here.
        </p>
      </div>

      <div className="space-y-3">
        {bookings.map((booking) => {
          const open = openForBooking(booking.id);
          const isReviewingTransfer =
            open?.payment_method === "manual_transfer" && open.status === "pending_review";
          const isPendingTransfer =
            open?.payment_method === "manual_transfer" && open.status === "pending";
          const isOpenOnline = open && open.payment_method !== "manual_transfer";
          const href = isReviewingTransfer
            ? "#bank-transfer-receipts"
            : isPendingTransfer
              ? `?pending_transfer=${encodeURIComponent(open.reference)}#bank-transfer-receipts`
              : `/account/billing/sessions/${booking.id}`;
          const ctaLabel = isReviewingTransfer
            ? "Check receipt status"
            : isPendingTransfer
              ? "Upload transfer receipt"
              : isOpenOnline
                ? "Resume or switch payment"
                : `Pay ${formatCurrency(booking.fee_amount_kobo / 100)} · Bubbles or cash`;

          return (
            <div
              key={booking.id}
              className="bg-white rounded-lg border border-rose-200 p-3 md:p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 text-sm md:text-base truncate">
                    {booking.session_title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatWhen(booking.session_starts_at)}
                  </p>
                  {booking.channel === "admin" && (
                    <p className="text-[11px] text-slate-400 mt-1">Recorded as walk-in by admin</p>
                  )}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                  <p className="text-base md:text-lg font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(booking.fee_amount_kobo / 100)}
                  </p>
                  {open && (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      {isReviewingTransfer
                        ? "Receipt under review"
                        : isPendingTransfer
                          ? "Transfer pending"
                          : "Open online attempt"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Link href={href} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white">
                  {ctaLabel}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
