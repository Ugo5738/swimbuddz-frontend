"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight, BookOpenCheck, ClipboardCheck, FileText,
  Landmark, Receipt, Users, Wallet, ChartNoAxesCombined,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";

type Bank = { id: string; code: string; bank_name: string; statement_balance_minor: number | null; statement_as_of: string | null };
type Summary = { banks: Bank[]; pending_requests: number; approved_awaiting_bank_evidence: number; unmatched_statement_lines: number; confirmed_expenses_minor: number };
type Recon = { bank_id: string; code: string; latest_statement_balance_minor: number | null; latest_statement_date: string | null; difference_minor: number | null; status: string; unmatched_rows: number };
type Projection = { scenario: string; projected_ending_minor: number | null; latest_bank_snapshot_date: string | null; pending_approved_expenses_minor: number; caveat: string };
const BASE = "/api/v1/admin/finance/treasury";
const naira = (minor: number) => formatNaira(minor / 100);
const actions = [
  { href: "/admin/finance/treasury", label: "Bank Accounts", icon: Landmark, description: "Verified statements and bank ledger links" },
  { href: "/admin/finance/treasury#requests", label: "Transfers", icon: ArrowLeftRight, description: "Treasury allocations and payment preparation" },
  { href: "/admin/finance/treasury#requests", label: "Expenses", icon: Receipt, description: "Expense documentation and programme allocation" },
  { href: "/admin/finance/treasury#requests", label: "Approvals", icon: ClipboardCheck, description: "Maker-checker queue and bank confirmation" },
  { href: "/admin/finance/treasury#budgets", label: "Budgets", icon: Wallet, description: "Operating and treasury funding ceilings" },
  { href: "/admin/finance/treasury#reconciliation", label: "Reconciliation", icon: BookOpenCheck, description: "Statement-to-ledger verification" },
  { href: "/admin/finance/intelligence", label: "Finance Intelligence", icon: ChartNoAxesCombined, description: "Academy, Club, Store, payments and future obligations" },
  { href: "/admin/finance/reports", label: "Reports", icon: ChartNoAxesCombined, description: "Cash, profit and programme performance" },
  { href: "/admin/finance/users", label: "Finance Team", icon: Users, description: "Role-based finance access" },
];
export default function FinanceHome() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reconciliations, setReconciliations] = useState<Recon[]>([]);
  const [projection, setProjection] = useState<Projection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, r, p] = await Promise.all([
        apiGet<Summary>(BASE + "/summary", { auth: true }),
        apiGet<Recon[]>(BASE + "/reconciliation/banks", { auth: true }),
        apiGet<Projection>(BASE + "/cash-projection?days=30&scenario=base", { auth: true }),
      ]);
      setSummary(s); setReconciliations(r); setProjection(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finance information is unavailable.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <main className="mx-auto max-w-6xl space-y-6 p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">SwimBuddz Ltd</p>
        <h1 className="text-3xl font-semibold text-slate-900">Finance</h1>
        <p className="mt-1 text-sm text-slate-600">Stanbic treasury • Moniepoint operations • verified financial controls</p>
      </div>
      <button onClick={() => void load()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Refresh</button>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Finance information could not be loaded: {error}. No balances are assumed.</p>}
    <div className="grid gap-4 md:grid-cols-2">
      {(["stanbic", "moniepoint"] as const).map(code => {
        const bank = summary?.banks.find(b => b.code === code);
        const reconciliation = reconciliations.find(r => r.code === code);
        return <section key={code} className="rounded-xl border bg-white p-5">
          <div className="flex justify-between gap-2"><h2 className="font-semibold">{code === "stanbic" ? "Stanbic · Treasury" : "Moniepoint · Operations"}</h2>
            <span className="text-xs text-slate-500">Statement-attested</span></div>
          <p className="mt-3 text-2xl font-semibold">{bank?.statement_balance_minor != null ? naira(bank.statement_balance_minor) : "Not verified"}</p>
          <p className="mt-1 text-xs text-slate-500">{bank?.statement_as_of ? "Bank statement balance as of " + bank.statement_as_of : "No approved balance snapshot"} · Not live</p>
          <p className="mt-2 text-xs text-slate-600">
            {reconciliation ? reconciliation.status.replaceAll("_", " ") +
              (reconciliation.difference_minor != null ? " · Difference " + naira(reconciliation.difference_minor) : "") : "Ledger check pending"}
          </p>
        </section>;
      })}
    </div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Awaiting approval", summary?.pending_requests],
        ["Awaiting bank evidence", summary?.approved_awaiting_bank_evidence],
        ["Needs reconciliation", summary?.unmatched_statement_lines],
        ["Expenses confirmed", summary ? naira(summary.confirmed_expenses_minor) : undefined],
      ].map(([label, value]) => <div key={label} className="rounded-xl border bg-white p-4">
        <p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value ?? "—"}</p>
      </div>)}
    </section>
    <section className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="font-semibold">30-day cash forecast</h2>
          <p className="text-xs text-slate-500">Scenario model · based on planning assumptions and matched-date bank snapshots</p></div>
        <Link href="/admin/finance/treasury#forecasts" className="text-sm text-cyan-700 underline">Manage forecast</Link>
      </div>
      <p className="mt-3 text-xl font-semibold">{projection?.projected_ending_minor != null ? naira(projection.projected_ending_minor) : "Requires verified opening balances"}</p>
      <p className="mt-1 text-xs text-slate-500">This is a forecast, not a current bank balance. {projection?.caveat}</p>
    </section>
    <section className="rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Finance workspace</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {actions.map(({ href, label, icon: Icon, description }) => <Link key={label} href={href}
          className="flex gap-3 rounded-lg border border-slate-100 p-3 transition hover:border-cyan-500 hover:bg-cyan-50/40">
          <Icon className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />
          <span><span className="block font-medium">{label}</span><span className="text-xs text-slate-500">{description}</span></span>
        </Link>)}
      </div>
    </section>
    <p className="text-xs text-slate-500">No banking credentials are stored in SwimBuddz. Internal approvals do not send funds.</p>
  </main>;
}
