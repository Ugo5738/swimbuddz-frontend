"use client";

import {
  PaymentMethodChoice,
  type CheckoutPaymentMethod,
} from "@/components/checkout/PaymentMethodChoice";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  ProductPaymentOptions,
  PaymentAdjustments,
} from "@/components/checkout/ProductPaymentOptions";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  ParticipantFields,
  ParticipantDetails,
  blankParticipant,
} from "@/components/experience/ParticipantFields";
import { useApi } from "@/hooks/useApi";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import {
  ChargePreview,
  CommunityExperienceQuote,
  quoteCommunityExperience,
} from "@/lib/clubOnboarding";
import { formatCurrency } from "@/lib/upgradeContext";

type ExperienceEvent = {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  location_area: string | null;
  is_location_private: boolean;
};
type Offering = {
  id: string;
  name: string;
  currency: string;
  period_start: string;
  period_end: string;
  max_guests_per_member: number;
  ticket_options: Array<{ kind: string; amount_kobo: number }>;
  events: ExperienceEvent[];
};
type Ticket = {
  id: string;
  full_name: string;
  ticket_kind: string;
  price_kobo: number;
  needs_safety_details: boolean;
};
type Order = {
  id: string;
  status: string;
  amount_kobo: number;
  membership_fee_kobo: number;
  expires_at: string;
  payment_reference: string;
  tickets: Ticket[];
  events: ExperienceEvent[];
};
type Checkout = {
  checkout_quote?: ChargePreview;
  authorization_url?: string;
  confirmed?: boolean;
  amount_kobo?: number;
  additional_charges?: Array<{ label: string; amount_kobo: number }>;
};
type SavedOrder = {
  payment_method?: CheckoutPaymentMethod;
  idempotency_key: string;
  access_token: string;
  order_id?: string;
  adjustments?: PaymentAdjustments;
  checkout_started?: boolean;
};
const money = (kobo: number) => formatCurrency(kobo / 100);

export default function ExperienceTicketPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const offering = useApi<Offering>(`/api/v1/clubs/community-experiences/public/${offeringId}`);
  const [signedIn, setSignedIn] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [quote, setQuote] = useState<CommunityExperienceQuote | null>(null);
  const [existing, setExisting] = useState<Order[]>([]);
  const [primary, setPrimary] = useState(blankParticipant);
  const [guests, setGuests] = useState<ParticipantDetails[]>([]);
  const [includeMember, setIncludeMember] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [paymentQuote, setPaymentQuote] = useState<ChargePreview | null>(null);
  const [adjustments, setAdjustments] = useState<PaymentAdjustments>({});
  const [quotePending, setQuotePending] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [saved, setSaved] = useState<SavedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("paystack");
  const [error, setError] = useState("");
  const [completing, setCompleting] = useState<string | null>(null);
  const [safety, setSafety] = useState(blankParticipant);
  const storageKey = `swimbuddz:experience:${offeringId}`;
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not complete checkout");
    } finally {
      setBusy(false);
    }
  };
  const refresh = async (record = saved) => {
    if (record?.order_id)
      setOrder(
        await apiPost<Order>(
          `/api/v1/clubs/community-experiences/orders/${record.order_id}/status`,
          { access_token: record.access_token }
        )
      );
  };
  useEffect(() => {
    let active = true;
    getCurrentAccessToken()
      .then(async (token) => {
        if (!active) return;
        setSignedIn(Boolean(token));
        setAuthLoaded(true);
        if (token) {
          const owned = await apiGet<Order[]>(
            `/api/v1/clubs/community-experiences/${offeringId}/tickets/me`,
            { auth: true }
          );
          if (!active) return;
          setExisting(owned);
          const price = await quoteCommunityExperience(offeringId);
          if (!active) return;
          setQuote(price);
          if (price.already_purchased) setIncludeMember(false);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Could not load your tickets");
      });
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const record = JSON.parse(raw) as SavedOrder;
        if (record.access_token && record.idempotency_key) {
          setSaved(record);
          setAdjustments(record.adjustments || {});
          setPaymentMethod(record.payment_method || "paystack");
          if (record.order_id)
            apiPost<Order>(`/api/v1/clubs/community-experiences/orders/${record.order_id}/status`, {
              access_token: record.access_token,
            })
              .then((value) => {
                if (active) setOrder(value);
              })
              .catch((e) => {
                if (active) setError(e.message);
              });
        }
      }
    } catch {
      setError(
        "This browser could not restore checkout. If you already paid, contact Admin with your payment reference."
      );
    }
    return () => {
      active = false;
    };
  }, [offeringId, storageKey]);
  useEffect(() => {
    if (!order || order.status !== "pending_payment" || !saved || order.amount_kobo === 0) return;
    let active = true;
    setQuotePending(true);
    apiPost<ChargePreview>(
      `/api/v1/clubs/community-experiences/orders/${order.id}/checkout-preview`,
      { access_token: saved.access_token, ...adjustments, payment_method: paymentMethod },
      { auth: true }
    )
      .then((value) => {
        if (active) {
          setPaymentQuote(value);
          setQuoteError("");
        }
      })
      .catch((e) => {
        if (active) setQuoteError(e instanceof Error ? e.message : "Could not price checkout");
      })
      .finally(() => {
        if (active) setQuotePending(false);
      });
    return () => {
      active = false;
    };
  }, [order, saved, adjustments, paymentMethod]);
  const reserve = async () => {
    let record = saved;
    if (!record) {
      record = {
        idempotency_key: crypto.randomUUID(),
        access_token: crypto.randomUUID() + crypto.randomUUID(),
      };
      localStorage.setItem(storageKey, JSON.stringify(record));
      setSaved(record);
    }
    const result = await apiPost<Order>(
      `/api/v1/clubs/community-experiences/${offeringId}/orders`,
      {
        idempotency_key: record.idempotency_key,
        access_token: record.access_token,
        order_id: undefined,
        include_member: includeMember,
        participant: primary,
        guests,
      },
      { auth: true }
    );
    record = { ...record, order_id: result.id };
    localStorage.setItem(storageKey, JSON.stringify(record));
    setSaved(record);
    setOrder(result);
  };
  const initialize = async () => {
    if (!order || !saved) return;
    const record = { ...saved, adjustments, payment_method: paymentMethod, checkout_started: true };
    localStorage.setItem(storageKey, JSON.stringify(record));
    setSaved(record);
    const result = await apiPost<Checkout>(
      `/api/v1/clubs/community-experiences/orders/${order.id}/checkout`,
      {
        access_token: saved.access_token,
        ...adjustments,
        payment_method: paymentMethod,
        expected_total_kobo: paymentQuote?.total_kobo,
      },
      { auth: true }
    );
    setCheckout(result);
    if (result.checkout_quote) setPaymentQuote(result.checkout_quote);
    if (result.confirmed) await refresh();
  };
  const newOrder = () => {
    localStorage.removeItem(storageKey);
    setSaved(null);
    setCheckout(null);
    setPaymentQuote(null);
    setAdjustments({});
    setQuoteError("");
    if (order?.status === "confirmed") {
      setExisting((old) => [...old.filter((o) => o.id !== order.id), order]);
      setIncludeMember(false);
      if (quote) setQuote({ ...quote, already_purchased: true });
    }
    setOrder(null);
    setGuests([]);
  };
  if (offering.loading || !authLoaded) return <LoadingCard text="Loading Experience..." />;
  const data = offering.data;
  const rate = signedIn
    ? quote?.amount_kobo
    : data?.ticket_options.find((t) => t.kind === "public_guest")?.amount_kobo;
  const confirmed = order?.status === "confirmed";
  const owned = [
    ...existing.filter((o) => o.id !== order?.id),
    ...(confirmed && order ? [order] : []),
  ];
  const ownedEvents = owned.flatMap((o) => o.events);
  const eventDetails =
    data?.events.map((e) => ownedEvents.find((ownedEvent) => ownedEvent.id === e.id) ?? e) ??
    ownedEvents;
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Link href="/community/experiences" className="text-cyan-700 underline">
        Community Experiences
      </Link>
      <h1 className="text-3xl font-bold">{data?.name ?? "Community Experience"}</h1>
      {!signedIn && (
        <Alert>
          Public guests can purchase without annual Membership where offered. Already a member?{" "}
          <Link
            className="underline"
            href={`/login?redirect=${encodeURIComponent(`/experiences/${offeringId}`)}`}
          >
            Sign in for your eligible price
          </Link>
          .
        </Alert>
      )}
      {(error || offering.error) && <Alert variant="error">{error || offering.error}</Alert>}
      {eventDetails.map((event) => (
        <Card key={event.id}>
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p>
            {new Date(event.start_time).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
            {event.end_time
              ? ` → ${new Date(event.end_time).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}`
              : ""}{" "}
            (Lagos time)
          </p>
          <p className="mt-2 whitespace-pre-wrap">{event.description}</p>
          <p className="mt-2 text-slate-600">
            {event.location ?? event.location_area ?? "Venue to be confirmed"}
            {event.is_location_private && !event.location
              ? " — full venue after confirmed purchase"
              : ""}
          </p>
        </Card>
      ))}
      {owned.map((purchase) => (
        <Card key={purchase.id}>
          <h2 className="font-semibold">Confirmed tickets</h2>
          <p className="break-all text-sm">Reference: {purchase.payment_reference}</p>
          {purchase.tickets.map((ticket) => (
            <div key={ticket.id} className="mt-3">
              <p>
                {ticket.full_name} · {ticket.ticket_kind.replaceAll("_", " ")} ·{" "}
                {money(ticket.price_kobo)}
              </p>
              {ticket.needs_safety_details && (
                <Button
                  className="mt-2"
                  variant="outline"
                  onClick={() => {
                    setCompleting(ticket.id);
                    setSafety(blankParticipant());
                  }}
                >
                  Complete participant safety details
                </Button>
              )}
            </div>
          ))}
        </Card>
      ))}
      {confirmed && signedIn && (
        <Button variant="outline" onClick={newOrder}>
          Start a separate guests-only order
        </Button>
      )}
      {completing && (
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await apiPut(
                  `/api/v1/clubs/community-experiences/participants/${completing}/my-details`,
                  safety,
                  { auth: true }
                );
                setCompleting(null);
                setExisting(
                  await apiGet<Order[]>(
                    `/api/v1/clubs/community-experiences/${offeringId}/tickets/me`,
                    { auth: true }
                  )
                );
                await refresh();
              });
            }}
          >
            <fieldset disabled={busy}>
              <ParticipantFields
                title="Participant safety details"
                value={safety}
                onChange={setSafety}
              />
              <Button className="mt-3" type="submit">
                Save safety details
              </Button>
            </fieldset>
          </form>
        </Card>
      )}
      {order && !confirmed && (
        <Card>
          <h2 className="text-xl font-semibold">Review your frozen order</h2>
          {order.tickets.map((ticket) => (
            <p className="mt-2" key={ticket.id}>
              {ticket.full_name} · {ticket.ticket_kind.replaceAll("_", " ")} ·{" "}
              {money(ticket.price_kobo)}
            </p>
          ))}
          {order.membership_fee_kobo > 0 && (
            <p className="mt-2">Annual SwimBuddz Membership: {money(order.membership_fee_kobo)}</p>
          )}
          <p className="mt-3 font-semibold">Subtotal: {money(order.amount_kobo)}</p>
          <p className="mt-2 text-sm">
            Seats held until {new Date(order.expires_at).toLocaleString()}. Payment reference:{" "}
            <span className="break-all">{order.payment_reference}</span>
          </p>
          <p className="my-3 text-sm text-slate-600">
            If you have already paid, refresh confirmation. Do not pay again. Retain this browser
            and reference to recover your ticket.
          </p>
          {order.amount_kobo > 0 && (
            <PaymentMethodChoice
              value={paymentMethod}
              disabled={busy || !!saved?.checkout_started || !!paymentQuote?.selection_locked}
              onChange={(method) => {
                setPaymentMethod(method);
                setAdjustments((value) => ({ ...value, bubbles_to_apply: 0 }));
                setQuotePending(true);
              }}
            />
          )}
          {order.amount_kobo > 0 && (
            <ProductPaymentOptions
              online={paymentMethod === "paystack"}
              quote={paymentQuote || { subtotal_kobo: order.amount_kobo }}
              value={adjustments}
              member={signedIn}
              disabled={
                busy ||
                quotePending ||
                !!saved?.checkout_started ||
                !!paymentQuote?.selection_locked
              }
              error={quoteError}
              onChange={(value) => {
                setQuotePending(true);
                setAdjustments(value);
              }}
            />
          )}
          {(paymentQuote?.additional_charges || checkout?.additional_charges)?.map(
            (line, index) => (
              <p key={index}>
                {line.label}: {money(line.amount_kobo)}
              </p>
            )
          )}
          {paymentQuote && (
            <p className="my-3 font-semibold">
              {paymentQuote.bubbles_to_apply
                ? "Remaining online payment"
                : "Total including payment charges"}
              : {money(paymentQuote.total_kobo)}
            </p>
          )}
          {(saved?.checkout_started || paymentQuote?.selection_locked) && (
            <p className="my-3 text-sm text-slate-600">
              This payment has started. Its discount and Bubbles selection are fixed; retry resumes
              the same reference.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} variant="outline" onClick={() => run(() => refresh())}>
              Refresh confirmation
            </Button>
            {new Date(order.expires_at) > new Date() &&
              (checkout?.authorization_url ? (
                <a
                  className="rounded-lg bg-cyan-700 px-4 py-2 text-white"
                  href={checkout.authorization_url}
                >
                  Continue to secure payment
                </a>
              ) : (
                <Button
                  disabled={
                    busy || quotePending || !!quoteError || (order.amount_kobo > 0 && !paymentQuote)
                  }
                  onClick={() => run(initialize)}
                >
                  {order.amount_kobo === 0
                    ? "Confirm free tickets"
                    : paymentQuote?.total_kobo === 0
                      ? paymentQuote.bubbles_to_apply
                        ? "Pay with Bubbles"
                        : "Confirm discounted tickets"
                      : "Continue to payment"}
                </Button>
              ))}
          </div>
          {new Date(order.expires_at) <= new Date() && (
            <Alert>
              Reservation expired. If unpaid, you can start a fresh order after checking
              confirmation. If paid, contact Admin for reconciliation; do not pay again.
            </Alert>
          )}
        </Card>
      )}
      {order && !confirmed && new Date(order.expires_at) <= new Date() && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const latest = await apiPost<Order>(
                `/api/v1/clubs/community-experiences/orders/${order.id}/status`,
                { access_token: saved?.access_token }
              );
              if (latest.status === "confirmed") {
                setOrder(latest);
                return;
              }
              newOrder();
            })
          }
        >
          I have not paid — start a new order
        </Button>
      )}
      {data && !order && (
        <Card>
          <h2 className="text-xl font-semibold">
            {quote?.already_purchased ? "Add named guests" : "Book your Experience"}
          </h2>
          <p className="my-3">
            {rate != null
              ? `Your ${signedIn ? "eligible member" : "public guest"} ticket: ${money(rate)}`
              : "No ticket is available for this account / guest option."}{" "}
            {signedIn && (quote?.annual_membership_fee_kobo ?? 0) > 0 && !quote?.already_purchased
              ? `Annual Membership if due: ${money(quote!.annual_membership_fee_kobo)}.`
              : ""}
          </p>
          <p className="mb-4 text-sm text-slate-600">
            One package ticket covers all listed Events. No separate Event RSVP payment. Guest
            prices and availability are configured for this offering.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(reserve);
            }}
          >
            <fieldset disabled={busy || rate == null || (signedIn && !quote)} className="space-y-4">
              {signedIn && quote?.already_purchased && (
                <label>
                  <input type="checkbox" checked={includeMember} disabled /> Your own ticket is
                  already confirmed — guests-only checkout
                </label>
              )}
              <ParticipantFields
                title={
                  signedIn
                    ? includeMember
                      ? "Your participant details"
                      : "Payer details"
                    : "Public guest details"
                }
                value={primary}
                onChange={setPrimary}
              />
              {guests.map((guest, index) => (
                <div key={index}>
                  <ParticipantFields
                    title={`Guest ${index + 1}`}
                    value={guest}
                    onChange={(value) =>
                      setGuests((old) => old.map((item, i) => (i === index ? value : item)))
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    onClick={() => setGuests((old) => old.filter((_, i) => i !== index))}
                  >
                    Remove guest {index + 1}
                  </Button>
                </div>
              ))}
              {signedIn && data.ticket_options.some((t) => t.kind === "member_guest") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={guests.length >= data.max_guests_per_member}
                  onClick={() => setGuests((old) => [...old, blankParticipant()])}
                >
                  Add guest / +1 ·{" "}
                  {money(data.ticket_options.find((t) => t.kind === "member_guest")!.amount_kobo)}
                </Button>
              )}
              <p className="text-sm">
                Details are used for tickets, activity safety and operational communications.{" "}
                <Link className="underline" href="/privacy">
                  Privacy policy
                </Link>
              </p>
              <Button type="submit" disabled={busy || (!includeMember && !guests.length)}>
                {busy ? "Reserving…" : "Reserve and review exact price"}
              </Button>
            </fieldset>
          </form>
        </Card>
      )}
    </main>
  );
}
