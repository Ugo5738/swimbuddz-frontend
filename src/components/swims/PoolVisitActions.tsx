"use client";

import { apiGet, apiPost } from "@/lib/api";
import type { PoolVisitBooking } from "@/lib/my-swims";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { useState } from "react";

type Ticket = { id: string; guest_name: string; ticket: string | null; checked_in_at: string | null };

export function PoolVisitActions({
  booking,
  onChanged,
}: {
  booking: PoolVisitBooking;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  async function run(task: () => Promise<void>) {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await task();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const verify = () => run(async () => {
    if (!booking.payment_reference) return;
    await apiPost(
      `/api/v1/payments/paystack/verify/${encodeURIComponent(booking.payment_reference)}`,
      {},
      { auth: true }
    );
    await onChanged();
    setMessage("Payment verification requested. Your booking status has been refreshed.");
  });

  const resumeCheckout = () => run(async () => {
    const payment = await apiPost<{ checkout_url: string | null; status: string }>(
      "/api/v1/payments/intents",
      { purpose: "pool_access", pool_access_booking_id: booking.id, payment_method: "paystack", currency: "NGN" },
      { auth: true }
    );
    if (payment.status === "paid") {
      await onChanged();
      setMessage("Payment is already recorded.");
      return;
    }
    if (!payment.checkout_url) {
      throw new Error("Checkout is awaiting confirmation. Please contact SwimBuddz if you have already been charged.");
    }
    window.location.assign(payment.checkout_url);
  });

  const cancelHold = () => {
    if (!window.confirm("Cancel this unpaid pool visit hold?")) return;
    void run(async () => {
      await apiPost(`/api/v1/pools/access/bookings/${booking.id}/cancel`, {}, { auth: true });
      await onChanged();
      setMessage("Unpaid hold cancelled.");
    });
  };

  const requestCancellation = () => {
    const reason = window.prompt("Why do you need to cancel this visit? SwimBuddz will review the request before any refund or ticket change.");
    if (reason === null) return;
    if (reason.trim().length < 5) {
      setError("Please provide a reason with at least five characters.");
      return;
    }
    void run(async () => {
      await apiPost(
        `/api/v1/pools/access/bookings/${booking.id}/request-cancellation`,
        { reason: reason.trim() }, { auth: true }
      );
      setMessage("Cancellation review requested. Your ticket remains valid until a decision is confirmed.");
    });
  };

  const loadTickets = () => run(async () => {
    const rows = await apiGet<Ticket[]>(
      `/api/v1/pools/access/bookings/${booking.id}/tickets`,
      { auth: true }
    );
    setTickets(rows);
  });

  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency", currency: booking.currency || "NGN",
  }).format(booking.selling_total_kobo / 100);

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">{booking.headcount} swimmer(s) · {amount}</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-cyan-50 p-3 text-sm text-cyan-800">{message}</p>}
      <div className="flex flex-wrap gap-2">
        {booking.status === "confirmed" ? (
          <>
            <button type="button" disabled={busy} onClick={() => void loadTickets()}
              className="min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Loading…" : tickets ? "Refresh admission codes" : "View QR tickets"}
            </button>
            <button type="button" disabled={busy} onClick={requestCancellation}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50">
              Request cancellation review
            </button>
          </>
        ) : booking.payment_reference ? (
          <button type="button" disabled={busy} onClick={() => void verify()}
            className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
            {busy ? "Verifying…" : "Verify payment"}
          </button>
        ) : booking.status === "pending_payment" ? (
          <>
            <button type="button" disabled={busy} onClick={() => void resumeCheckout()}
              className="min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Please wait…" : "Resume payment"}
            </button>
            <button type="button" disabled={busy} onClick={cancelHold}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">
              Cancel unpaid hold
            </button>
          </>
        ) : <p className="text-sm text-slate-500">No active admission credentials for this booking.</p>}
      </div>
      {booking.status === "pending_payment" && !booking.payment_reference && (
        <p className="text-xs text-amber-800">Tickets are issued only after verified payment. A started payment may need reconciliation before cancellation.</p>
      )}
      {tickets !== null && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="Admission tickets">
          {tickets.length === 0 && <p className="text-sm text-slate-600">No tickets are available yet.</p>}
          {tickets.map((ticket) => (
            <article key={ticket.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{ticket.guest_name}</p>
              {ticket.checked_in_at ? (
                <p className="mt-2 text-sm text-green-700">Used at check-in {new Date(ticket.checked_in_at).toLocaleString("en-NG")}</p>
              ) : ticket.ticket ? (
                <div className="mt-3 inline-block rounded-lg bg-white p-3">
                  <QRCodeSVG value={ticket.ticket} size={180} aria-label={`Entry QR for ${ticket.guest_name}`} />
                </div>
              ) : <p className="mt-2 text-sm text-slate-600">Ticket pending issuance.</p>}
              <p className="mt-2 text-xs text-slate-600">Present this code at authorised SwimBuddz reception. Each ticket works once.</p>
            </article>
          ))}
        </div>
      )}
      <Link href="/pool-access" className="inline-block text-sm font-medium text-cyan-700 hover:underline">
        Find another independent pool visit
      </Link>
    </div>
  );
}
