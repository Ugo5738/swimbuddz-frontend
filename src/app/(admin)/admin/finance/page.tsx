import Link from "next/link";
import {AlertCircle, BookOpenCheck, CreditCard, FileText, Wallet} from "lucide-react";
const actions=[
 {href:"/admin/payments",label:"Review payments",description:"Verify pending transfers, payment proofs and settlement exceptions.",icon:CreditCard},
 {href:"/admin/finance/reconciliation",label:"Reconcile transactions",description:"Compare verified payments, allocations and ledger records.",icon:BookOpenCheck},
 {href:"/admin/finance/invoices",label:"Invoices",description:"Review receivables and invoice records.",icon:FileText},
 {href:"/admin/finance/deferred-revenue",label:"Deferred revenue",description:"Review outstanding service delivery obligations.",icon:Wallet},
 {href:"/admin/refunds",label:"Refunds and exceptions",description:"Handle disputes, reversals and failed admissions.",icon:AlertCircle},
];
export default function FinanceHome(){
 return <main className="mx-auto max-w-5xl space-y-6 p-6">
  <header><p className="text-sm font-semibold uppercase tracking-wide text-cyan-700">SwimBuddz operations</p>
   <h1 className="text-3xl font-bold text-slate-900">Finance</h1>
   <p className="mt-2 max-w-2xl text-slate-600">Prioritise items that need action. Financial reports, transaction reviews and settlement workflows are kept together while access remains role-specific.</p>
  </header>
  <div className="grid gap-4 sm:grid-cols-2">{actions.map(x=>{const Icon=x.icon;return <Link href={x.href} key={x.href} className="rounded-xl border bg-white p-5 transition hover:border-cyan-500">
   <Icon className="mb-3 h-6 w-6 text-cyan-700"/><h2 className="font-semibold text-slate-900">{x.label}</h2>
   <p className="mt-1 text-sm text-slate-600">{x.description}</p>
  </Link>})}</div>
  <Link href="/admin/finance/reports" className="text-cyan-700 underline">View financial reports →</Link>
 </main>;
}
