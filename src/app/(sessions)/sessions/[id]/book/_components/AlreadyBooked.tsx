import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiPost } from "@/lib/api";
import { getLocationDisplayName, type Session } from "@/lib/sessions";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type AlreadyBookedProps = {
  session: Session;
  existingBookingStatus: string;
  existingRideBooking: any;
  hasRideShareAreas: boolean;
  onAddRideShare?: () => void;
  /** If present, the existing booking has an outstanding pool fee that the
   * member can settle in-place. Typically set when an admin recorded a
   * walk-in but the member hadn't paid online. */
  unpaidBooking?: {
    id: string;
    fee_amount_kobo: number;
  } | null;
};

const formatNgn = (naira: number) => `₦${naira.toLocaleString("en-NG")}`;

export function AlreadyBooked({
  session,
  existingBookingStatus,
  existingRideBooking,
  hasRideShareAreas,
  onAddRideShare,
  unpaidBooking,
}: AlreadyBookedProps) {
  const [paying, setPaying] = useState(false);

  const handlePayOutstanding = async () => {
    if (!unpaidBooking) return;
    setPaying(true);
    try {
      const intent = await apiPost<{ checkout_url: string | null }>(
        "/api/v1/payments/intents",
        {
          purpose: "session_booking",
          currency: "NGN",
          payment_method: "paystack",
          session_id: session.id,
          direct_amount: unpaidBooking.fee_amount_kobo / 100,
          payment_metadata: { booking_id: unpaidBooking.id },
        },
        { auth: true },
      );
      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
      } else {
        toast.error("Unable to start payment. Please try again.");
        setPaying(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to start payment.";
      toast.error(msg);
      setPaying(false);
    }
  };

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

  const canAddRide = hasRideShareAreas && !existingRideBooking;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <Card className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-3xl">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-emerald-600">
            {existingRideBooking ? "You\u2019re booked!" : "You\u2019re already booked!"}
          </h1>
          <p className="text-lg font-semibold text-slate-900">{session.title}</p>
          <p className="text-slate-600">
            {getLocationDisplayName(session.location, session.location_name)} — {formattedDate},{" "}
            {startTime}–{endTime}
          </p>
          <p className="text-sm text-slate-500">
            Status: <span className="font-semibold capitalize">{existingBookingStatus}</span>
          </p>
        </div>

        {existingRideBooking && (
          <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">🚗</span>
              <div className="space-y-1">
                <p className="font-semibold text-cyan-900">Ride Share Booked</p>
                {existingRideBooking.ride_area_name && (
                  <p className="text-sm text-cyan-700">
                    Area: {existingRideBooking.ride_area_name}
                  </p>
                )}
                {existingRideBooking.pickup_location_name && (
                  <p className="text-sm text-cyan-700">
                    Pickup: {existingRideBooking.pickup_location_name}
                  </p>
                )}
                {existingRideBooking.ride_number && (
                  <p className="text-sm text-cyan-700">Ride #: {existingRideBooking.ride_number}</p>
                )}
                {existingRideBooking.num_seats && (
                  <p className="text-sm text-cyan-700">Seats: {existingRideBooking.num_seats}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Offer ride share if available and not yet booked */}
        {canAddRide && (
          <button
            type="button"
            onClick={onAddRideShare}
            className="w-full rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/30 hover:bg-cyan-50 transition-colors p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <div className="text-left">
                <p className="font-semibold text-cyan-900">Need a ride to the pool?</p>
                <p className="text-sm text-cyan-600">Add a ride share for this session</p>
              </div>
              <svg
                className="w-5 h-5 text-cyan-400 ml-auto flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Outstanding pool fee — typically an admin-recorded walk-in
            where the member hadn't paid online. Pay button reuses the
            same Paystack/session_booking flow as the regular book page. */}
        {unpaidBooking && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-xl">💳</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-rose-900">Pool fee outstanding</p>
                <p className="text-sm text-rose-700">
                  Your booking is confirmed but the pool fee for this session
                  hasn't been paid yet.
                </p>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handlePayOutstanding}
              disabled={paying}
            >
              {paying
                ? "Starting payment…"
                : `Pay ${formatNgn(unpaidBooking.fee_amount_kobo / 100)}`}
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link href="/account/attendance/history">
            <Button className="w-full">View My Attendance</Button>
          </Link>
          <Link href="/sessions">
            <Button variant="secondary" className="w-full">
              Back to Sessions
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
