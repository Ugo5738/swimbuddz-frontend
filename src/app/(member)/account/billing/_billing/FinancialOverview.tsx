"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { buildFinancialOverview } from "./financialOverview";
import type { Enrollment, PaymentRecord, UnpaidBooking, StoreCreditSummary, BubbleWallet } from "../types";
import { formatCurrency, formatDate } from "../utils";

type Props = {
  enrollments: Enrollment[];
  sessions: UnpaidBooking[] | null;
  transfers: PaymentRecord[];
  credits: StoreCreditSummary | null;
  wallet: BubbleWallet | null;
  incomplete: boolean;
  onRefresh: () => void;
  refreshing: boolean;
};

const money = (kobo: number) => formatCurrency(kobo / 100);

export function FinancialOverview({ enrollments, sessions, transfers, credits, wallet, incomplete, onRefresh, refreshing }: Props) {
  const overview = buildFinancialOverview(enrollments, sessions ?? [], transfers);
  const incompleteTotal = incomplete || sessions === null || overview.needsQuote.length > 0;
  const groups = [
    { title: "Needs payment", subtitle: "Payments due now or past their due date", items: overview.due, accent: "amber" },
    { title: "Coming up", subtitle: "You can pay early, but these are not late", items: overview.upcoming, accent: "slate" },
    { title: "We're checking your payment", subtitle: "Do not pay again while your transfer is being reviewed", items: overview.checking, accent: "cyan" },
  ] as const;
  return <section aria-label="Your payment overview" className="space-y-4">
    <Card className="space-y-4 border-cyan-100 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your payment overview</h2>
          <p className="mt-1 text-sm text-slate-600">See what needs attention before choosing how to pay.</p>
        </div>
        <button type="button" disabled={refreshing} onClick={onRefresh} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-cyan-800 disabled:opacity-50">{refreshing ? "Checking…" : "Refresh"}</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-900 p-4 text-white">
          <p className="text-sm text-slate-200">Due now or overdue</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{money(overview.dueKobo)}</p>
          <p className="mt-2 text-xs text-slate-200">{overview.due.length} recorded payment{overview.due.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-600">Upcoming instalments</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{money(overview.upcomingKobo)}</p>
          <p className="mt-2 text-xs text-slate-500">Not overdue · pay ahead if you prefer</p>
        </div>
      </div>
      {incompleteTotal && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Some payment records could not be confirmed. These totals are partial, not your full account balance. Please refresh or check your enrolment details.</p>}
      <p className="text-xs text-slate-500">Figures are from Academy instalments and confirmed unpaid session bookings. Other purchases and renewals are shown separately, not counted as debt.</p>
    </Card>
    {groups.map((group) => <Card key={group.title} className="space-y-3 p-4 md:p-6">
      <div>
        <h3 className="font-semibold text-slate-900">{group.title}</h3>
        <p className="text-sm text-slate-600">{group.subtitle}</p>
      </div>
      {group.items.length === 0 ? <p className="text-sm text-slate-500">Nothing here right now.</p> :
        <div className="divide-y divide-slate-100">
          {group.items.map((item) => <div key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-600">{item.detail}{item.date ? ` · ${formatDate(item.date)}` : ""}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="font-semibold tabular-nums text-slate-900">{money(item.amountKobo)}</span>
              <Link href={item.href} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white">
                {item.status === "checking" ? "View status" : item.status === "upcoming" ? "View instalment" : "Review & pay"}
              </Link>
            </div>
          </div>)}
        </div>}
    </Card>)}
    {overview.needsQuote.length > 0 && <Card className="space-y-2 p-4">
      <h3 className="font-semibold">Payment details need checking</h3>
      <p className="text-sm text-slate-600">We couldn't confirm an exact amount for these enrolments. They are not included in the totals above.</p>
      {overview.needsQuote.map(item => <Link key={item.id} href={item.href} className="block py-2 text-sm font-medium text-cyan-700 underline">{item.title} — View details</Link>)}
    </Card>}
    <Card className="space-y-3 p-4 md:p-6">
      <h3 className="font-semibold text-slate-900">Your credits</h3>
      <p className="text-sm text-slate-600">These are separate types of credit; you can't automatically use one in place of another.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-3">
          <p className="text-sm text-slate-600">Bubbles</p>
          <p className="text-xl font-semibold">{wallet?.status === "active" ? (wallet.available_balance ?? wallet.balance).toLocaleString() : "Not available"}</p>
          <Link href="/account/wallet" className="text-sm font-medium text-cyan-700 underline">View Bubbles</Link>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-slate-600">Store credit</p>
          <p className="text-xl font-semibold">{credits ? formatCurrency(Number(credits.total_balance_ngn)) : "Not available"}</p>
          <Link href="/store" className="text-sm font-medium text-cyan-700 underline">Shop with store credit</Link>
        </div>
      </div>
    </Card>
    <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
      <p className="font-semibold text-slate-900">Already sent money?</p>
      <p className="mt-1">Please don't transfer again just because a payment still shows as pending. Check the bank transfer section below, upload your receipt if needed, and wait for verification.</p>
      <a href="#bank-transfer-receipts" className="mt-2 inline-block font-medium text-cyan-700 underline">Check bank transfer receipts</a>
    </div>
  </section>;
}
