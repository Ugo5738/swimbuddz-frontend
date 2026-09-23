"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { SessionVolunteerPanel } from "@/components/volunteer/SessionVolunteerPanel";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { format } from "date-fns";
import { ArrowLeft, Calendar, CheckCircle, CreditCard, MapPin, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface Event {
  community_experience_offering_id?: string | null;
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
  total_cost_naira: number | null;
  pool_id: string | null;
  created_by: string;
  created_at: string;
  rsvp_count?: Partial<Record<"going" | "maybe" | "not_going", number>>;
  participation_mode: "rsvp" | "session" | "experience" | "unavailable";
  linked_session_count: number;
  participation_state_available: boolean;
}

type WalletData = { balance: number; available_balance?: number };

interface LinkedEventSession {
  id: string;
  title: string;
  status: string;
  starts_at: string;
  ends_at: string;
  location_name?: string | null;
  capacity: number;
  pool_fee: number;
  allows_guests: boolean;
}

const eventTypeLabels: Record<string, string> = {
  community_swim: "Official Community Swim",
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

  const {
    data: event,
    loading,
    refetch: refetchEvent,
  } = useApi<Event>(eventId ? `/api/v1/events/${eventId}` : null);
  const linkedSessionPath =
    event && event.event_type !== "open_swim" && event.participation_mode !== "unavailable"
      ? `/api/v1/sessions/?types=event&event_id=${encodeURIComponent(event.id)}&limit=100`
      : null;
  const {
    data: linkedSessions,
    error: linkedSessionsError,
    loading: linkedSessionsLoading,
  } = useApi<LinkedEventSession[]>(linkedSessionPath);
  const { data: wallet } = useApi<WalletData>("/api/v1/wallet/me");
  const { data: me } = useApi<{ id: string }>("/api/v1/members/me");
  const hasLinkedSessions =
    event?.participation_mode === "session" || (linkedSessions?.length ?? 0) > 0;
  const participationUnavailable =
    event?.participation_mode === "unavailable" || !!linkedSessionsError;
  const hasVisibleLinkedSessions = (linkedSessions?.length ?? 0) > 0;
  const walletBalance = wallet ? (wallet.available_balance ?? wallet.balance) : null;
  const meId = me?.id ?? null;
  const [userRsvp, setUserRsvp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [payWithBubbles, setPayWithBubbles] = useState(false);
  const [waiverAccepted, setWaiverAccepted] = useState(false);

  const handleRsvp = async (status: "going" | "maybe" | "not_going") => {
    const cost = event?.total_cost_naira ?? event?.cost_naira ?? 0;
    const paid = !!cost && cost > 0;
    const openSwim = event?.event_type === "open_swim";

    if (status === "going" && paid && openSwim && !waiverAccepted) {
      toast.error("Please accept the liability waiver to join this meet.");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status };
      if (status === "going" && paid) {
        body.pay_with_bubbles = payWithBubbles;
      }
      if (status === "going" && openSwim && paid) {
        body.waiver_accepted = waiverAccepted;
      }
      await apiPost(`/api/v1/events/${eventId}/rsvp`, body, { auth: true });
      setUserRsvp(status);
      refetchEvent();
      if (status === "going" && payWithBubbles && paid) {
        const bubblesUsed = cost / 100;
        toast.success(`RSVP confirmed! ${bubblesUsed} 🫧 Bubbles used.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to RSVP. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const rsvpCounts = {
    going: event?.rsvp_count?.going ?? 0,
    maybe: event?.rsvp_count?.maybe ?? 0,
    not_going: event?.rsvp_count?.not_going ?? 0,
  };

  const effectiveCost = event?.total_cost_naira ?? event?.cost_naira ?? null;
  const hasCost = !!(effectiveCost && effectiveCost > 0);
  const isExactBubbleAmount = hasCost && effectiveCost! % 100 === 0;
  const bubblesNeeded = isExactBubbleAmount ? effectiveCost! / 100 : 0;
  const canPayWithBubbles =
    isExactBubbleAmount && walletBalance !== null && walletBalance >= bubblesNeeded;
  const isOpenSwim = event?.event_type === "open_swim";
  const requiresWaiver = hasCost && isOpenSwim;
  const isOwner = !!meId && !!event && meId === event.created_by;
  const accessLabel: Record<string, string> = {
    public: "Open to everyone",
    community: "Community members",
    club: "Club members",
    academy: "Academy students",
    invite_only: "Invitees only",
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center text-slate-600">Loading event...</div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 py-12 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Event not found</h2>
        <Button onClick={() => router.push("/community/events")}>Back to Events</Button>
      </div>
    );
  }

  const isPastEvent = new Date(event.start_time) < new Date();
  const showEventAdmission =
    isOpenSwim || (!participationUnavailable && !linkedSessionsLoading && !hasLinkedSessions);
  const isFullyBooked =
    showEventAdmission && event.max_capacity && rsvpCounts.going >= event.max_capacity;

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      {/* Back Button + owner controls */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => router.push("/community/events")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Button>
        {isOwner && isOpenSwim && (
          <Link href={`/community/events/${eventId}/edit`}>
            <Button variant="secondary" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit meet
            </Button>
          </Link>
        )}
      </div>

      {/* Event Header */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* Event Type Badge */}
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-700">
              {eventTypeLabels[event.event_type] || event.event_type}
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
              {accessLabel[event.tier_access] ?? event.tier_access.replaceAll("_", " ")}
            </span>
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
                  {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
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

            {showEventAdmission && event.max_capacity && (
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

            {showEventAdmission && hasCost && (
              <div className="flex items-center gap-2 text-slate-700">
                <span className="text-base">🎟️</span>
                <div>
                  <div className="font-medium">Entry Fee</div>
                  <div className="text-slate-600">
                    ₦{effectiveCost!.toLocaleString()}{" "}
                    {isExactBubbleAmount && (
                      <span className="text-xs text-slate-400">· {bubblesNeeded} 🫧</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold text-slate-900">About this event</h3>
            <p className="mt-2 text-slate-700">{event.description}</p>
          </div>
        </div>
      </Card>

      {/* RSVP Section */}
      {event.community_experience_offering_id && (
        <Card className="p-6">
          <h3 className="font-semibold">Included in a Community Experience</h3>
          <p className="my-3 text-slate-600">
            Review the package and named guest tickets. There is no separate Event entry payment.
          </p>
          <Link
            className="text-cyan-700 underline"
            href={`/experiences/${event.community_experience_offering_id}`}
          >
            View Experience and my tickets
          </Link>
        </Card>
      )}
      {hasVisibleLinkedSessions && !isPastEvent ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Swimming sessions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Capacity, prices, member and guest places, attendance, volunteer support, and
              ride-share are managed by the Session{linkedSessions!.length === 1 ? "" : "s"} below.
            </p>
          </div>
          {linkedSessions!.map((session) => (
            <Card key={session.id} className="border-cyan-200 bg-cyan-50 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">{session.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">
                    {format(new Date(session.starts_at), "EEE, d MMM yyyy · h:mm a")} · capacity{" "}
                    {session.capacity}
                    {session.pool_fee > 0 ? ` · ₦${session.pool_fee.toLocaleString()}` : " · free"}
                    {session.allows_guests ? " · guest places available" : ""}
                  </p>
                </div>
                <Link href={`/sessions/${session.id}/book`}>
                  <Button>View and book</Button>
                </Link>
              </div>
            </Card>
          ))}
        </section>
      ) : null}
      {event.participation_mode === "session" &&
      !linkedSessionsLoading &&
      !linkedSessions?.length &&
      !isPastEvent ? (
        <Card className="border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-950">Booking is being prepared</h3>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            This Event uses Session booking, but its Session is not published yet. Check back soon;
            a separate Event RSVP is intentionally not available.
          </p>
        </Card>
      ) : null}
      {participationUnavailable && !isPastEvent ? (
        <Card className="border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-950">
            Participation details are temporarily unavailable
          </h3>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The Event is still available to view, but booking status cannot be verified right now.
            RSVP is disabled to prevent duplicate participation records. Please try again shortly.
          </p>
        </Card>
      ) : null}
      {!isPastEvent &&
        !event.community_experience_offering_id &&
        !hasLinkedSessions &&
        !participationUnavailable &&
        !linkedSessionsLoading && (
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Your RSVP</h3>

            {isFullyBooked && userRsvp !== "going" ? (
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Event is fully booked.</strong> You can still mark yourself as
                &quot;Maybe&quot; to be notified if spots open up.
              </div>
            ) : null}

            {/* Payment Method — only for paid events, only when not fully booked */}
            {hasCost && !(isFullyBooked && userRsvp !== "going") && (
              <div className="mb-6 space-y-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Entry Fee Payment</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose how to pay the ₦{effectiveCost!.toLocaleString()} entry fee
                  </p>
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
                      <div
                        className={`flex-shrink-0 rounded-lg p-2 ${!payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}
                      >
                        <CreditCard
                          className={`h-5 w-5 ${!payWithBubbles ? "text-cyan-600" : "text-slate-400"}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">Card Payment</p>
                          {!payWithBubbles && (
                            <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Paystack · Card, bank, USSD</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xl font-bold text-slate-900">
                      ₦{effectiveCost!.toLocaleString()}
                    </p>
                  </div>

                  {/* Bubbles */}
                  <div
                    onClick={() => {
                      if (canPayWithBubbles) setPayWithBubbles(true);
                    }}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      payWithBubbles
                        ? "border-cyan-500 bg-cyan-50 ring-1 ring-cyan-300 cursor-pointer"
                        : canPayWithBubbles
                          ? "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40 cursor-pointer"
                          : "border-slate-200 bg-white cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 rounded-lg p-2 text-xl leading-none ${payWithBubbles ? "bg-cyan-100" : "bg-slate-100"}`}
                      >
                        🫧
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">Pay with Bubbles</p>
                          {payWithBubbles && (
                            <span className="text-xs font-medium px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded-full">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">SwimBuddz wallet</p>
                      </div>
                    </div>

                    <p className="mt-3 text-xl font-bold text-slate-900">
                      {isExactBubbleAmount ? (
                        <>
                          {bubblesNeeded}{" "}
                          <span className="text-sm font-normal text-slate-500">Bubbles</span>
                        </>
                      ) : (
                        <span className="text-sm font-medium text-slate-500">Card only</span>
                      )}
                    </p>

                    {walletBalance !== null ? (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Your balance</span>
                          <span
                            className={`font-semibold ${
                              canPayWithBubbles
                                ? "text-emerald-600"
                                : isExactBubbleAmount
                                  ? "text-red-500"
                                  : "text-slate-500"
                            }`}
                          >
                            {walletBalance} 🫧 {canPayWithBubbles ? "✓" : ""}
                          </span>
                        </div>
                        {!canPayWithBubbles && isExactBubbleAmount && (
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

            {requiresWaiver && (
              <label className="mb-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Checkbox
                  checked={waiverAccepted}
                  onChange={(e) => setWaiverAccepted(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700">
                  I understand this is a peer-organized swim and I join at my own risk. I accept the{" "}
                  <span className="font-medium">liability waiver</span>.
                </span>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => handleRsvp("going")}
                disabled={
                  submitting ||
                  !!(isFullyBooked && userRsvp !== "going") ||
                  (requiresWaiver && !waiverAccepted)
                }
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
                      {payWithBubbles
                        ? `${bubblesNeeded} 🫧`
                        : `₦${effectiveCost!.toLocaleString()}`}
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
                <span className="font-semibold text-emerald-700">{rsvpCounts.going}</span>
                <span className="ml-1 text-slate-600">going</span>
              </div>
              <div>
                <span className="font-semibold text-amber-700">{rsvpCounts.maybe}</span>
                <span className="ml-1 text-slate-600">maybe</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">{rsvpCounts.not_going}</span>
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

      {/* Volunteer opportunities attached to this event — renders nothing
          if there are no open slots the viewer can claim. */}
      {!isPastEvent && !hasLinkedSessions && !participationUnavailable && (
        <SessionVolunteerPanel eventId={event.id} />
      )}
    </div>
  );
}
