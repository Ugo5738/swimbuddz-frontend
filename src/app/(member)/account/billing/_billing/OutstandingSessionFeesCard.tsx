"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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

type PaymentIntentResponse = {
  reference: string;
  amount: number;
  checkout_url: string | null;
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

export function OutstandingSessionFeesCard() {
  const [bookings, setBookings] = useState<UnpaidBooking[] | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<UnpaidBooking[]>(
        "/api/v1/sessions/bookings/me/unpaid",
        { auth: true },
      );
      setBookings(data);
    } catch (e) {
      // Don't surface errors — this card is best-effort.
      console.warn("Failed to load unpaid bookings:", e);
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePay = async (booking: UnpaidBooking) => {
    setPaying(booking.id);
    try {
      // Reuse the existing session_booking payment intent flow. Same
      // Paystack + entitlement path used by the regular /sessions/[id]/book
      // page, so the webhook will mark the payment paid AND backfill the
      // booking's payment_intent_id (internal confirm endpoint update).
      const intent = await apiPost<PaymentIntentResponse>(
        "/api/v1/payments/intents",
        {
          purpose: "session_booking",
          currency: "NGN",
          payment_method: "paystack",
          session_id: booking.session_id,
          direct_amount: booking.fee_amount_kobo / 100,
          payment_metadata: { booking_id: booking.id },
        },
        { auth: true },
      );
      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else {
        toast.error("Unable to start payment. Please try again.");
        setPaying(null);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to start payment.";
      toast.error(msg);
      setPaying(null);
    }
  };

  if (!bookings || bookings.length === 0) return null;

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
        {bookings.map((booking) => (
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
                  <p className="text-[11px] text-slate-400 mt-1">
                    Recorded as walk-in by admin
                  </p>
                )}
              </div>
              <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                <p className="text-base md:text-lg font-bold text-slate-900 whitespace-nowrap">
                  {formatCurrency(booking.fee_amount_kobo / 100)}
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => handlePay(booking)}
                disabled={paying === booking.id}
              >
                {paying === booking.id
                  ? "Starting payment…"
                  : `Pay ${formatCurrency(booking.fee_amount_kobo / 100)}`}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
