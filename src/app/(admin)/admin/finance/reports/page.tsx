"use client";

import Link from "next/link";
import { BalanceSheetSection, ProfitLossSection, TrialBalanceSection } from "./_statements";
import { BubblesLiabilitySection, CashPositionSection, MarginSection } from "./_supplementary";

export default function FinanceReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finance — Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          The financial statements, straight from the ledger — trial balance, P&amp;L, balance
          sheet, cash position, gross margin, and the Bubbles liability. Amounts in Naira.
        </p>
      </div>
      <div className="rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold">Academy commercial commitments</h2>
        <p className="mt-1 text-sm text-slate-600">Compare enrolment list values with negotiated cash obligations. This is an operational contract view, not recognized revenue.</p>
        <Link href="/admin/finance/reports/academy-contracts" className="mt-3 inline-block text-sm font-medium text-cyan-700 underline">View Academy contracts and concessions</Link>
      </div>
      <TrialBalanceSection />
      <ProfitLossSection />
      <BalanceSheetSection />
      <CashPositionSection />
      <MarginSection />
      <BubblesLiabilitySection />
    </div>
  );
}
