"use client";

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
      <TrialBalanceSection />
      <ProfitLossSection />
      <BalanceSheetSection />
      <CashPositionSection />
      <MarginSection />
      <BubblesLiabilitySection />
    </div>
  );
}
