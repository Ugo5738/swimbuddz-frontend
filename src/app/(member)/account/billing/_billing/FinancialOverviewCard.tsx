"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { ServerFinancialOverview } from "./serverFinancialOverview";
import type { StoreCreditSummary, BubbleWallet } from "../types";
import { formatCurrency, formatDate } from "../utils";

type Props = {
  credits: StoreCreditSummary | null;
  wallet: BubbleWallet | null;
  serverOverview: ServerFinancialOverview | null;
  incomplete: boolean;
  hasPendingTransfers?: boolean;
  onRefresh: () => void;
  onViewHistory?: () => void;
  refreshing: boolean;
};

const NAIRA_PER_BUBBLE = 100;
const money = (kobo: number) => formatCurrency(kobo / 100);

export function FinancialOverview({
  credits,
  wallet,
  serverOverview,
  incomplete,
  hasPendingTransfers = false,
  onRefresh,
  onViewHistory,
  refreshing,
}: Props) {
  const overview = serverOverview
    ? {
        due: serverOverview.items
          .filter((item) => item.status === "due" || item.status === "overdue")
          .map((item) => ({ ...item, amountKobo: item.amount_kobo, date: item.due_at })),
        upcoming: serverOverview.items
          .filter((item) => item.status === "upcoming")
          .map((item) => ({ ...item, amountKobo: item.amount_kobo, date: item.due_at })),
        checking: serverOverview.items
          .filter((item) => item.status === "checking")
          .map((item) => ({ ...item, amountKobo: item.amount_kobo, date: item.due_at })),
        needsQuote: serverOverview.unpriced,
        dueKobo: serverOverview.due_kobo,
        upcomingKobo: serverOverview.upcoming_kobo,
      }
    : { due: [], upcoming: [], checking: [], needsQuote: [], dueKobo: 0, upcomingKobo: 0 };

  const incompleteTotal = incomplete || !serverOverview || !serverOverview.complete;
  const canDisplayTotals = !!serverOverview;
  const hasDue = overview.dueKobo > 0 || overview.due.length > 0;
  const allCaughtUp =
    canDisplayTotals &&
    !incompleteTotal &&
    !hasDue &&
    overview.checking.length === 0 &&
    overview.needsQuote.length === 0;

  const activeGroups = [
    {
      title: "Needs payment",
      subtitle: "Payments due now or past their due date",
      items: overview.due,
      borderClass: "border-amber-200 bg-amber-50/40",
    },
    {
      title: "We’re checking your payment",
      subtitle: "Do not pay again while your transfer is being reviewed",
      items: overview.checking,
      borderClass: "border-cyan-200 bg-cyan-50/40",
    },
    {
      title: "Coming up",
      subtitle: "You can pay early, but these are not late",
      items: overview.upcoming,
      borderClass: "border-slate-200 bg-white",
    },
  ].filter((group) => group.items.length > 0);

  const liveBubbles =
    wallet?.status === "active" ? (wallet.available_balance ?? wallet.balance) : null;

  return (
    <section aria-label="Your payment overview" className="space-y-4">
      {/* Top 2-Column Overview: Payment Status + Your Credits */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="space-y-4 border-slate-200 p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Payment status
              </h2>
              {allCaughtUp && (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  ✓ All caught up
                </span>
              )}
              {hasDue && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  {overview.due.length} {overview.due.length === 1 ? "item" : "items"} due
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={refreshing}
              onClick={onRefresh}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {refreshing ? "Checking…" : "Refresh"}
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={`rounded-xl border p-4 ${
                hasDue
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : allCaughtUp
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                    : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <p className="text-xs font-medium opacity-80">Due now or overdue</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {canDisplayTotals ? money(overview.dueKobo) : "Not available"}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {hasDue
                  ? `${overview.due.length} recorded payment${overview.due.length === 1 ? "" : "s"}`
                  : "No overdue payments"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-900">
              <p className="text-xs font-medium text-slate-500">Upcoming instalments</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {canDisplayTotals ? money(overview.upcomingKobo) : "Not available"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview.upcoming.length > 0
                  ? "Not overdue · pay ahead if you prefer"
                  : "No scheduled instalments"}
              </p>
            </div>
          </div>

          {incompleteTotal && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Some payment records could not be confirmed. These totals are partial, not your full
              account balance. Please refresh or check your enrolment details.
            </p>
          )}

          <p className="text-xs text-slate-500">
            Covers Academy instalments and confirmed unpaid sessions. Optional renewals and store
            purchases are listed separately.
          </p>
        </Card>

        <Card className="flex flex-col justify-between space-y-4 border-slate-200 p-5 lg:col-span-5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Your credits
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Bubbles and store credit are separate balances and cannot be used interchangeably.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Bubbles Wallet</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                  {liveBubbles !== null ? `${liveBubbles.toLocaleString()} 🫧` : "Not available"}
                </p>
                {liveBubbles !== null && (
                  <p className="text-xs text-slate-500">
                    {formatCurrency(liveBubbles * NAIRA_PER_BUBBLE)} value
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2.5 text-xs font-semibold text-cyan-700">
                  <Link href="/account/wallet" className="hover:underline">
                    Wallet
                  </Link>
                  <Link href="/account/wallet/topup" className="hover:underline">
                    Top up
                  </Link>
                  <Link href="/account/wallet/rewards" className="hover:underline">
                    Rewards
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs text-slate-500">Store Credit</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">
                  {credits ? formatCurrency(Number(credits.total_balance_ngn)) : "Not available"}
                </p>
                <p className="text-xs text-slate-500">For Swim Store</p>
                <Link
                  href="/store"
                  className="mt-2 inline-block text-xs font-semibold text-cyan-700 hover:underline"
                >
                  Shop Store →
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-900">Already sent a transfer?</span>{" "}
            {hasPendingTransfers ? (
              <a
                href="#bank-transfer-receipts"
                className="font-semibold text-cyan-700 underline underline-offset-2"
              >
                Check pending bank transfers below
              </a>
            ) : onViewHistory ? (
              <button
                type="button"
                onClick={onViewHistory}
                className="font-semibold text-cyan-700 underline underline-offset-2"
              >
                Check your payment history
              </button>
            ) : (
              <span>Don’t transfer twice while a payment is being reviewed.</span>
            )}
          </div>
        </Card>
      </div>

      {/* Render ONLY non-empty obligation groups (zero "Nothing here right now" clutter!) */}
      {!serverOverview && !refreshing && (
        <Card className="p-4 text-sm text-amber-900 border-amber-200 bg-amber-50">
          We couldn’t confirm your payment items right now. Please refresh to check again.
        </Card>
      )}

      {activeGroups.map((group) => (
        <Card key={group.title} className={`space-y-3 p-4 md:p-5 ${group.borderClass}`}>
          <div>
            <h3 className="font-semibold text-slate-900">{group.title}</h3>
            <p className="text-xs text-slate-600">{group.subtitle}</p>
          </div>
          <div className="divide-y divide-slate-200/70 rounded-xl border border-slate-200 bg-white">
            {group.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600">
                    {item.detail}
                    {item.date ? ` · ${formatDate(item.date)}` : ""}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="font-semibold tabular-nums text-slate-900">
                    {money(item.amountKobo)}
                  </span>
                  <Link
                    href={item.href}
                    className="rounded-xl bg-cyan-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-800"
                  >
                    {item.status === "checking"
                      ? "View status"
                      : item.status === "upcoming"
                        ? "View instalment"
                        : "Review & pay"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {overview.needsQuote.length > 0 && (
        <Card className="space-y-2 border-amber-200 bg-amber-50/60 p-4">
          <h3 className="font-semibold text-slate-900">Payment details need checking</h3>
          <p className="text-sm text-slate-600">
            We couldn’t confirm an exact amount for these enrolments. They are not included in the
            totals above.
          </p>
          {overview.needsQuote.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block py-1.5 text-sm font-medium text-cyan-700 underline"
            >
              {item.title} — View details
            </Link>
          ))}
        </Card>
      )}

      {!!serverOverview?.optional_purchases.length && (
        <Card className="space-y-3 p-4 md:p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Unfinished store purchases</h3>
            <p className="text-xs text-slate-600">
              These are orders you started, not automatic debts. Review each order before paying
              again.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {(serverOverview?.optional_purchases ?? [])
              .map((order) => ({
                id: order.id,
                order_number: order.href.split("/").pop() ?? "",
                status: order.status,
                total_ngn: order.amount_kobo / 100,
              }))
              .map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900">Order {order.order_number}</p>
                    <p className="text-xs text-slate-600">
                      {formatCurrency(Number(order.total_ngn))} ·{" "}
                      {order.status === "payment_failed"
                        ? "Payment unsuccessful"
                        : "Checkout unfinished"}
                    </p>
                  </div>
                  <Link
                    href={`/account/orders/${encodeURIComponent(order.order_number)}`}
                    className="shrink-0 text-sm font-semibold text-cyan-700 underline"
                  >
                    View order
                  </Link>
                </div>
              ))}
          </div>
        </Card>
      )}
    </section>
  );
}
