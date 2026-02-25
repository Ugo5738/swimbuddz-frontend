"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiGet, apiPost } from "@/lib/api";
import { apiEndpoints } from "@/lib/config";
import { format } from "date-fns";
import { ArrowLeft, Calendar, CheckCircle, CreditCard, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  location: string;
  start_time: string;
  end_time: string | null;
  max_capacity: number | null;
  tier_access: string;
  cost_naira: number | null;
  created_at: string;
}

interface RSVP {
  id: string;
  member_id: string;
  status: "going" | "maybe" | "not_going";
  created_at: string;
}

type WalletData = { balance: number };

const eventTypeLabels: Record<string, string> = {
  social: "Social Event",
  volunteer: "Volunteer Activity",
  beach_day: "Beach Day",
  watch_party: "Watch Party",
  cleanup: "Beach Cleanup",
  training: "Training Session",
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [userRsvp, setUserRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payWithBubbles, setPayWithBubbles] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      fetchRsvps();
    }
    apiGet<WalletData>("/api/v1/wallet/me", { auth: true })
      .then((data) => setWalletBalance(data.balance))
      .catch(() => {});
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${apiEndpoints.events}/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRsvps = async () => {
    try {
      const response = await fetch(`${apiEndpoints.events}/${eventId}/rsvps`);
      if (response.ok) {
        const data = await response.json();
        setRsvps(data);
      }
    } catch (error) {
      console.error("Failed to fetch RSVPs:", error);
    }
  };

  const handleRsvp = async (status: "going" | "maybe" | "not_going") => {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status };
      if (status === "going" && event?.cost_naira && event.cost_naira > 0) {
        body.pay_with_bubbles = payWithBubbles;
      }
      await apiPost(`/api/v1/events/${eventId}/rsvp`, body, { auth: true });
      setUserRsvp(status);
      await fetchRsvps();
      if (status === "going" && payWithBubbles && event?.cost_naira && event.cost_naira > 0) {
        const bubblesUsed = Math.ceil(event.cost_naira / 100);
        toast.success(`RSVP confirmed! ${bubblesUsed} 🫧 Bubbles used.`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to RSVP. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const rsvpCounts = {
    going: rsvps.filter((r) => r.status === "going").length,
    maybe: rsvps.filter((r) => r.status === "maybe").length,
    not_going: rsvps.filter((r) => r.status === "not_going").length,
  };

  const hasCost = !!(event?.cost_naira && event.cost_naira > 0);
  const bubblesNeeded = hasCost ? Math.ceil(event!.cost_naira! / 100) : 0;
  const canPayWithBubbles = hasCost && walletBalance !== null && walletBalance >= bubblesNeeded;

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-slate-600">
        Loading event...
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Event not found</h2>
        <Button onClick={() => router.push("/community/events")}>
          Back to Events
        </Button>
      </div>
    );
  }

  const isPastEvent = new Date(event.start_time) < new Date();
  const isFullyBooked =
    event.max_capacity && rsvpCounts.going >= event.max_capacity;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      {/* Back Button */}
      <Button
        variant="secondary"
        onClick={() => router.push("/community/events")}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Events
      </Button>

      {/* Event Header */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Event Type Badge */}
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700">
              {eventTypeLabels[event.event_type] || event.event_type}
            </span>
            {event.tier_access !== "community" && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                {event.tier_access} members only
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 border-y border-slate-200 py-4 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="h-5 w-5 text-slate-400" />
              <div>
                <div className="font-medium">
                  {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                </div>
                <div className="text-slate-600">
                  {format(new Date(event.start_time), "h:mm a")}
                  {event.end_time &&
                    ` - ${format(new Date(event.end_time), "h:mm a")}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-5 w-5 text-slate-400" />
              <div>
                <div className="font-medium">Location</div>
                <div className="text-slate-600">{event.location}</div>
              </div>
            </div>

            {event.max_capacity && (
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="h-5 w-5 text-slate-400" />
                <div>
                  <div className="font-medium">Capacity</div>
                  <div className="text-slate-600">
                    {rsvpCounts.going} / {event.max_capacity} attending
                  </div>
                </div>
              </div>
            )}

            {hasCost && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-base">🎟️</span>
                <div>
                  <div className="font-medium">Entry Fee</div>
                  <div className="text-slate-600">
                    ₦{event.cost_naira!.toLocaleString()}{" "}
                    <span className="text-xs text-slate-400">
                      · {bubblesNeeded} 🫧
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-slate-900">
              About this event
            </h3>
            <p className="mt-2 text-slate-700">{event.description}</p>
          </div>
        </div>
      </Card>

      {/* RSVP Section */}
      {!isPastEvent && (
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Your RSVP
          </h3>

          {isFullyBooked && userRsvp !== "going" ? (
            <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Event is fully booked.</strong> You can still mark
              yourself as &quot;Maybe&quot; to be notified if spots open up.
            </div>
          ) : null}

          {/* Payment Method — only for paid events, only when not fully booked */}
          {hasCost && !(isFullyBooked && userRsvp !== "going") && (
            <div className="mb-6 space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">Entry Fee Payment</h4>
                <p className="text-xs text-slate-500 mt-0.5">Choose how to pay the ₦{event.cost_naira!.toLocaleString()} entry fee</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Card Payment */}
                <div
                  onClick={() => setPayWithBubbles(false)}
                  className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                    !payWithBubbles
                      ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300"
                      : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 rounded-lg p-2 ${!payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}>
                      <CreditCard className={`h-5 w-5 ${!payWithBubbles ? "text-cyan-600" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Card Payment</p>
                        {!payWithBubbles && (
                          <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">Paystack · Card, bank, USSD</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xl font-bold text-slate-900">₦{event.cost_naira!.toLocaleString()}</p>
                </div>

                {/* Bubbles */}
                <div
                  onClick={() => { if (canPayWithBubbles) setPayWithBubbles(true); }}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    payWithBubbles
                      ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300 cursor-pointer"
                      : canPayWithBubbles
                        ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40 cursor-pointer"
                        : "border-slate-200 bg-white cursor-default"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 rounded-lg p-2 text-xl leading-none ${payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}>
                      🫧
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">Pay with Bubbles</p>
                        {payWithBubbles && (
                          <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">Selected</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">SwimBuddz wallet</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xl font-bold text-slate-900">
                    {bubblesNeeded} <span className="text-sm font-normal text-slate-500">Bubbles</span>
                  </p>

                  {walletBalance !== null ? (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Your balance</span>
                        <span className={`font-semibold ${canPayWithBubbles ? "text-emerald-600" : "text-red-500"}`}>
                          {walletBalance} 🫧 {canPayWithBubbles ? "✓" : ""}
                        </span>
                      </div>
                      {!canPayWithBubbles && (
                        <Link
                          href="/account/wallet/topup"
                          className="mt-2 flex items-center justify-center gap-1 w-full text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg py-1.5 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Top Up {bubblesNeeded - walletBalance} more Bubbles →
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500">
                        <Link
                          href="/account/wallet"
                          className="text-cyan-600 font-medium underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Set up your wallet
                        </Link>{" "}
                        to pay with Bubbles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => handleRsvp("going")}
              disabled={submitting || !!(isFullyBooked && userRsvp !== "going")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-medium transition-all ${
                userRsvp === "going"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {userRsvp === "going" && <CheckCircle className="h-5 w-5" />}
              <div className="text-center">
                <div>Going</div>
                {hasCost && (
                  <div className="text-xs font-normal opacity-75 mt-0.5">
                    {payWithBubbles ? `${bubblesNeeded} 🫧` : `₦${event.cost_naira!.toLocaleString()}`}
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handleRsvp("maybe")}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-medium transition-all ${
                userRsvp === "maybe"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {userRsvp === "maybe" && <CheckCircle className="h-5 w-5" />}
              <span>Maybe</span>
            </button>

            <button
              onClick={() => handleRsvp("not_going")}
              disabled={!!submitting}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 font-medium transition-all ${
                userRsvp === "not_going"
                  ? "border-slate-500 bg-slate-50 text-slate-700"
                  : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {userRsvp === "not_going" && <CheckCircle className="h-5 w-5" />}
              <span>Can&apos;t Go</span>
            </button>
          </div>

          {/* RSVP Stats */}
          <div className="mt-6 flex gap-6 border-t border-slate-200 pt-4 text-sm">
            <div>
              <span className="font-semibold text-emerald-700">
                {rsvpCounts.going}
              </span>
              <span className="ml-1 text-slate-600">going</span>
            </div>
            <div>
              <span className="font-semibold text-amber-700">
                {rsvpCounts.maybe}
              </span>
              <span className="ml-1 text-slate-600">maybe</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">
                {rsvpCounts.not_going}
              </span>
              <span className="ml-1 text-slate-600">can't go</span>
            </div>
          </div>
        </Card>
      )}

      {isPastEvent && (
        <Card className="p-6 text-center">
          <p className="text-slate-600">This event has already passed.</p>
        </Card>
      )}
    </div>
  );
}
