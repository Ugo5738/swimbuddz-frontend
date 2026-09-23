"use client";

import {
  PaymentMethodChoice,
  type CheckoutPaymentMethod,
} from "@/components/checkout/PaymentMethodChoice";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { useGuestCapability } from "@/hooks/useGuestCapability";
import { createGuestPass, GuestPassOffer, trackGuestLink } from "@/lib/guestPasses";
import { formatCurrency } from "@/lib/upgradeContext";
import { Calendar, MapPin, ShieldCheck, Waves } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function GuestPassBookingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const searchParams = useSearchParams();
  const capability = useGuestCapability(`guest-booking:${sessionId}`);
  const offer = useApi<GuestPassOffer>(`/api/v1/sessions/${sessionId}/guest-pass`, {
    auth: false,
    enabled: capability.ready,
    headers: { "X-Guest-Booking-Token": capability.token },
  });
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    guardian_name: "",
    guardian_phone: "",
    waiver_accepted: false,
    marketing_consent: false,
    referral_code: searchParams.get("ref") || "",
  });
  useEffect(() => {
    if (!offer.data) return;
    const key = `guest-view:${sessionId}:${searchParams.get("source") || "direct"}:${searchParams.get("campaign") || ""}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Analytics must never block a booking. */
    }
    void trackGuestLink(
      sessionId,
      "view",
      searchParams.get("source") || "direct",
      searchParams.get("campaign") || undefined
    );
  }, [sessionId, searchParams, offer.data]);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("paystack");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const receipt = await createGuestPass(sessionId, {
        payment_method: paymentMethod,
        booking_source:
          searchParams.get("source") || (form.referral_code ? "member_share" : "direct"),
        campaign_key: searchParams.get("campaign") || undefined,
        access_token: capability.token || undefined,
        ...form,
        date_of_birth: form.date_of_birth || undefined,
        guardian_name: form.guardian_name || undefined,
        guardian_phone: form.guardian_phone || undefined,
        referral_code: form.referral_code || undefined,
      });
      if (receipt.receipt_url) {
        const token = new URL(receipt.receipt_url, window.location.origin).hash.slice(1);
        try {
          sessionStorage.setItem(
            `guest-receipt:${receipt.id}`,
            new URLSearchParams(token).get("token") || ""
          );
        } catch {
          /* The return URL also carries this capability. */
        }
      }
      if (receipt.checkout_url) {
        window.location.assign(receipt.checkout_url);
      } else {
        window.location.assign(receipt.receipt_url || `/guest-pass/${receipt.id}`);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not create your guest pass");
    } finally {
      setSubmitting(false);
    }
  };

  if (!capability.ready || offer.loading) return <LoadingCard text="Loading guest pass..." />;
  if (offer.error || !offer.data) {
    return (
      <Alert variant="error" title="Guest pass unavailable">
        {offer.error || "This session is unavailable."}
      </Alert>
    );
  }

  const session = offer.data;
  const settlement = session.booking_mode === "settlement";
  const requiresApproval =
    session.guest_booking_mode === "approval_required" && !session.approval_granted;
  const requiresInvite =
    session.guest_booking_mode === "member_invite" &&
    !form.referral_code &&
    !session.approval_granted;
  const unavailable =
    session.booking_mode === "closed" ||
    requiresApproval ||
    requiresInvite ||
    (session.booking_mode === "reservation" && (session.spaces_remaining ?? 0) < 1);

  return (
    <main className="mx-auto max-w-xl space-y-6 py-8">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
          <Waves className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {settlement ? "Complete your guest booking" : "Book your guest spot"}
        </h1>
        <p className="text-slate-600">
          {settlement
            ? "Already attended this swim? Register and settle your guest booking here. Our team confirms attendance separately."
            : "Book and pay for your own swim. You do not need a member account."}
        </p>
      </div>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">{session.title}</h2>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin className="h-4 w-4" />
          {session.location_name || "Pool location shared after booking"}
        </p>
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4" />
          {new Date(session.starts_at).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: session.timezone,
          })}
        </p>
        <div className="flex items-end justify-between border-t border-slate-100 pt-3">
          <span className="text-sm text-slate-600">Guest rate</span>
          <span className="text-2xl font-bold text-slate-900">
            {session.guest_fee_kobo == null
              ? "Not configured"
              : formatCurrency(session.guest_fee_kobo / 100)}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Guest and Community drop-in prices are configured separately and may differ by pool
          location. Any enabled online processing charge is shown separately at checkout.
        </p>
      </Card>

      {unavailable ? (
        <Alert title="Guest booking unavailable">
          {requiresApproval
            ? "This swim requires approval. Contact SwimBuddz for an individual guest booking link."
            : requiresInvite
              ? "Ask the member who invited you for their guest booking link."
              : session.booking_mode === "closed"
                ? "Online guest booking is closed. If you already attended, contact SwimBuddz for a reconciliation link."
                : "This swim is full. Please choose another session or contact SwimBuddz."}
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {session.guest_fee_kobo !== 0 && (
            <PaymentMethodChoice
              value={paymentMethod}
              onChange={setPaymentMethod}
              disabled={submitting}
            />
          )}
          <Alert>
            {settlement
              ? "This completes payment and registration for a swim that has started. It does not reserve a future space or mark you attended."
              : "Your space is held for 30 minutes during checkout. A bank-transfer receipt must be verified; uploading it does not extend the hold."}
          </Alert>
          <Card className="space-y-4">
            <h2 className="font-semibold text-slate-900">Your details</h2>
            {(
              [
                ["full_name", "Full name", "text", true],
                ["email", "Email", "email", true],
                ["phone", "Phone number", "tel", true],
                ["date_of_birth", "Date of birth", "date", false],
                ["guardian_name", "Guardian name (if under 18)", "text", false],
                ["guardian_phone", "Guardian phone (if under 18)", "tel", false],
              ] as const
            ).map(([key, label, type, required]) => (
              <label key={key} className="block space-y-1 text-sm font-medium text-slate-800">
                {label}
                <input
                  type={type}
                  required={required}
                  value={form[key] as string}
                  onChange={(event) => update(key, event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
                />
              </label>
            ))}
          </Card>

          <Card className="space-y-4">
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                required
                checked={form.waiver_accepted}
                onChange={(event) => update("waiver_accepted", event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <strong>Safety acknowledgement:</strong> I confirm my details are accurate and agree
                to follow pool safety instructions and the{" "}
                <Link
                  href="/club/standards"
                  target="_blank"
                  className="font-semibold text-cyan-700 underline underline-offset-2"
                >
                  SwimBuddz Club Standards
                </Link>
                .
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.marketing_consent}
                onChange={(event) => update("marketing_consent", event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                I would like SwimBuddz emails about relevant swims, programmes, and community
                updates. Booking emails are sent regardless.
              </span>
            </label>
            {form.referral_code ? (
              <p className="text-xs text-slate-500">Referral attribution: {form.referral_code}</p>
            ) : null}
          </Card>

          {submitError ? <Alert variant="error">{submitError}</Alert> : null}
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            <ShieldCheck className="mr-2 h-5 w-5" />
            {submitting
              ? "Starting payment..."
              : session.guest_fee_kobo === 0
                ? "Confirm free guest booking"
                : `Continue to pay ${formatCurrency((session.guest_fee_kobo ?? 0) / 100)}`}
          </Button>
        </form>
      )}
    </main>
  );
}
