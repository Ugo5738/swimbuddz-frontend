import Link from "next/link";

const sections = [
  {
    id: "roles", title: "1. Who does what?",
    content: [
      ["Finance Viewer", "Can review permitted reports and records. Cannot approve transactions or change journal entries."],
      ["Finance Operations — Comfort", "Can prepare expense and funding requests, enter planning assumptions and upload statement evidence. Cannot approve them or release money in the bank."],
      ["Accountant", "Can use controlled accounting corrections and reversals. This is a more sensitive permission than simply seeing financial information."],
      ["Finance Owner", "Approves independent requests, budgets, bank account mappings, evidence and ledger postings. Cannot approve a request they personally originated."],
      ["Store Procurement Officer", "Can prepare purchases, record deliveries and invoices, and request opening stock reviews. Cannot approve their own purchase or bank payments."],
    ],
  },
  {
    id: "setup", title: "2. Set up Finance for the first time",
    content: [
      ["Add Finance staff", "Go to Finance Team, invite Comfort with the Finance Operations role. Check her access separately from bank Initiator permissions."],
      ["Check bank records", "In Treasury & Operations, review Stanbic and Moniepoint records and their ledger mappings. Confirm historical postings before mapping or creating bank accounts."],
      ["Set budgets", "Create expense budgets and separate internal treasury-funding ceilings. Transferring money between company bank accounts is not a business expense."],
      ["Verify bank evidence", "Attest dated, genuine bank statement balances. The figures shown are not live bank balances, and imports are not proof of payment on their own."],
    ],
  },
  {
    id: "expenses", title: "3. Pay a legitimate business expense",
    content: [
      ["Prepare", "Finance Operations records the amount, source bank, business purpose, vendor, invoice/receipt evidence, category, programme and budget."],
      ["Approve internally", "Finance Owner reviews evidence, budget and conflicts of interest. Unbudgeted payments require a written exception reason."],
      ["Execute outside SwimBuddz", "Comfort initiates in the bank if authorised; the authorised bank approver releases the transaction there. SwimBuddz does not send money."],
      ["Confirm evidence", "Import the bank debit statement and verify it directly in the bank portal. Never equate a manual CSV with bank verification."],
      ["Post or reconcile", "If Payments, Paystack or a coach payout already created a journal, link it. Otherwise Owner can post the reviewed balanced entry exactly once."],
    ],
  },
  {
    id: "transfer", title: "4. Fund Moniepoint from Stanbic",
    content: [
      ["Request", "Choose Funding, not Expense, and allocate against a treasury funding budget."],
      ["Verify both banks", "After independent approval and the actual bank transfer, check Stanbic's debit and Moniepoint's credit."],
      ["Reconcile", "Link an existing balanced journal or post a reviewed internal transfer. This is neither sales revenue nor operational expense."],
    ],
  },
  {
    id: "reports", title: "5. Read the numbers correctly",
    content: [
      ["Finance Reports", "Use the posted trial balance, profit and loss and balance sheet for accounting. Investigate missing journal entries and reconciliation differences."],
      ["Finance Intelligence", "Compare Paystack settlements, Academy prepaid lessons, Club enrollments and Store supplier liabilities. These are planning signals, not verified bank cash or a statutory P&L."],
      ["Forecasts", "Try base, optimistic or conservative assumptions. Do not count the same approved expense twice as both an existing commitment and manually entered forecast outflow."],
    ],
  },
];
export default function FinanceGuidePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <Link href="/admin/finance" className="text-sm font-medium text-cyan-700 underline">Back to Finance overview</Link>
        <h1 className="text-3xl font-semibold text-slate-900">Finance operating guide</h1>
        <p className="text-sm text-slate-600">For SwimBuddz Finance Owner, Finance Operations and accountants. Start with permissions and bank setup, then follow the request → approval → bank evidence → accounting sequence.</p>
      </header>
      <aside className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Important:</strong> SwimBuddz internal approval never releases a bank transfer. CSV imports do not certify authentic bank movement. Do not post the same Paystack settlement, payout, refund or internal transfer twice.
      </aside>
      <nav aria-label="Finance guide sections" className="flex flex-wrap gap-2 text-sm">
        {sections.map(s => <a key={s.id} href={"#" + s.id} className="rounded-full border px-3 py-1 hover:bg-slate-50">{s.title}</a>)}
      </nav>
      {sections.map(section => (
        <section id={section.id} key={section.id} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{section.title}</h2>
          <ol className="space-y-3">
            {section.content.map(([title, description], i) => (
              <li key={title} className="flex gap-3">
                <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold">{i + 1}</span>
                <div><strong className="text-sm">{title}</strong><p className="text-sm text-slate-600">{description}</p></div>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 font-semibold">Common questions</h2>
        <p className="text-sm"><strong>Why is a bank balance missing?</strong> No independently attested statement snapshot has been recorded. A blank is safer than guessing.</p>
        <p className="mt-2 text-sm"><strong>Why do unused Academy classes matter?</strong> They represent future services SwimBuddz owes students, not necessarily outstanding payments.</p>
        <p className="mt-2 text-sm"><strong>Why does a Store inventory value say incomplete?</strong> The historical acquisition cost or stock movement has not been fully reconciled.</p>
        <p className="mt-2 text-sm"><strong>Can an Accountant approve a transfer?</strong> Treasury Owner approval and bank execution are distinct from accounting correction privileges.</p>
      </section>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/finance/users" className="font-medium text-cyan-700 underline">Finance Team</Link>
        <Link href="/admin/finance/treasury" className="font-medium text-cyan-700 underline">Treasury & Operations</Link>
        <Link href="/admin/finance/intelligence" className="font-medium text-cyan-700 underline">Finance Intelligence</Link>
        <Link href="/admin/store/procurement/guide" className="font-medium text-cyan-700 underline">Store Procurement guide</Link>
      </div>
    </main>
  );
}
