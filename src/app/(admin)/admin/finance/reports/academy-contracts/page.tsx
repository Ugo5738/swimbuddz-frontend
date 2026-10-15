"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type ContractRow = {
  enrollment_id: string;
  cohort_id: string | null;
  list_value_kobo: number;
  contracted_cash_value_kobo: number;
  concession_kobo: number;
  verified_paid_cash_kobo: number | null;
  outstanding_cash_obligation_kobo: number | null;
  applied_prior_cash_credit_kobo: number;
  needs_commercial_review: boolean;
};
type ContractReport = {
  enrollments: number;
  gross_list_value_kobo: number;
  contracted_cash_value_kobo: number;
  commercial_concessions_kobo: number;
  verified_paid_cash_kobo: number | null;
  outstanding_cash_obligations_kobo: number | null;
  items: ContractRow[];
  note: string;
};
const money = (kobo: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(kobo / 100);

export default function AcademyContractsReport() {
  const [report, setReport] = useState<ContractReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void apiGet<ContractReport>("/api/v1/academy/admin/finance/academy-contracts", { auth: true })
      .then(setReport).catch((e: Error) => setError(e.message));
  }, []);
  return <main className="mx-auto max-w-6xl space-y-6 py-6">
    <nav className="text-sm"><Link className="text-cyan-700 underline" href="/admin/finance/reports">← Finance reports</Link></nav>
    <header>
      <h1 className="text-2xl font-semibold">Academy contracts and concessions</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Understand what learners agreed to pay, separately from the public cohort price and the money already collected.
      </p>
    </header>
    {error && <p role="alert" className="rounded-lg border border-rose-200 p-4 text-rose-700">{error}</p>}
    {!report && !error && <p>Loading Academy contracts…</p>}
    {report && <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Gross list value", report.gross_list_value_kobo],
          ["Approved concessions", report.commercial_concessions_kobo],
          ["Contracted cash value", report.contracted_cash_value_kobo],
        ].map(([label, amount]) => <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">{String(label)}</p>
          <p className="mt-2 text-2xl font-semibold">{money(Number(amount))}</p>
        </div>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Verified tuition payments allocated</p>
          <p className="mt-2 text-2xl font-semibold">{report.verified_paid_cash_kobo == null ? "Not available" : money(report.verified_paid_cash_kobo)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">Remaining agreed cash obligations</p>
          <p className="mt-2 text-2xl font-semibold">{report.outstanding_cash_obligations_kobo == null ? "Needs reconciliation" : money(report.outstanding_cash_obligations_kobo)}</p>
        </div>
      </div>
      <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        These are commercial contract figures, not a cash collection report or recognized revenue.
        Check the ledger reports for actual income. {report.note}
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="p-3">Enrollment</th><th className="p-3">List value</th><th className="p-3">Concession</th><th className="p-3">Contracted</th><th className="p-3">Verified paid</th><th className="p-3">Still due</th><th className="p-3">Review</th></tr></thead>
          <tbody>{report.items.map(row => <tr className="border-t border-slate-200" key={row.enrollment_id}>
            <td className="p-3"><Link className="text-cyan-700 underline" href={`/admin/academy/enrollments/${row.enrollment_id}`}>View enrollment</Link></td>
            <td className="p-3">{money(row.list_value_kobo)}</td>
            <td className="p-3">{money(row.concession_kobo)}</td>
            <td className="p-3 font-semibold">{money(row.contracted_cash_value_kobo)}</td>
            <td className="p-3">{row.verified_paid_cash_kobo == null ? "Unavailable" : money(row.verified_paid_cash_kobo)}</td>
            <td className="p-3">{row.outstanding_cash_obligation_kobo == null ? "Check" : money(row.outstanding_cash_obligation_kobo)}</td>
            <td className="p-3">{row.needs_commercial_review ? "Check contract" : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>}
  </main>;
}
