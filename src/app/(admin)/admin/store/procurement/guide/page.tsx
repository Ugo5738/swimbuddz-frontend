import Link from "next/link";

const steps = [
  ["Request purchase", "Select an existing supplier and SKU, enter the quantity and landed acquisition cost, then save a purchase draft."],
  ["Submit for review", "Submit the draft. The requesting person must not approve their own purchase. The Finance Owner checks the commercial approval."],
  ["Record delivered stock", "After goods physically arrive, enter the delivery reference, optional PDF/image waybill upload, and actual received quantities. Verified receipts atomically update stock, moving weighted-average cost, and post DR Store Inventory / CR Accounts Payable to the Ledger."],
  ["Record & settle supplier invoices", "An approved PO can carry supplier invoice details (a liability, not payment). Once the bank transfer is confirmed and posted in Treasury as a Liability Settlement (DR Accounts Payable / CR Bank), Finance Owner records the partial or full invoice settlement linking the bank reference and posted journal UUID."],
  ["Reconcile existing legacy stock", "For historical stock on hand without acquisition cost, propose the physical count and documented acquisition cost (plus optional invoice upload). Independent Owner approval values the stock and posts DR Store Inventory / CR Retained Earnings. Unvalued legacy SKUs remain fulfillable operationally and are flagged as missing COGS until valued."],
  ["Approve customer credit & collect repayments", "Request credit terms on an unpaid open order. Independent Finance Owner approval (never self-approved by requester or buyer) posts DR Accounts Receivable / CR Store Revenue and unlocks controlled fulfillment. Finance Owner then records verified partial or full bank repayments (DR Bank / CR Accounts Receivable) until settled."],
  ["Process fulfilled-order returns & COGS reversals", "When a fulfilled order is returned, Finance Owner records the line quantities and condition (restockable vs. damaged). Restockable returns restore stock and moving-average valuation and post DR Store Inventory / CR Store COGS; damaged returns log shrinkage without inflating sellable stock."],
];
export default function ProcurementGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="space-y-2">
        <Link href="/admin/store/procurement" className="text-sm font-medium text-cyan-700 underline">Back to Procurement</Link>
        <h1 className="text-3xl font-semibold text-slate-900">Store Procurement guide</h1>
        <p className="text-sm text-slate-600">For Store Procurement Officer, Inventory Viewer and Finance Owner. Purchasing, receiving stock, invoicing and paying suppliers are distinct audited events connected end-to-end with the Ledger.</p>
      </header>
      <aside className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Do not infer costs from selling prices.</strong> Unknown legacy stock stays unvalued until supported by evidence and independently approved. No user may self-approve purchases, openings, settlements, credit terms, or returns on their own orders.
      </aside>
      <ol className="space-y-3">
        {steps.map(([title, body], i) => <li key={title} className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{i + 1}. {title}</h2>
          <p className="mt-1 text-sm text-slate-600">{body}</p>
        </li>)}
      </ol>
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Access and approvals</h2>
        <p className="mt-2 text-sm text-slate-600">Procurement Officer prepares purchases, records deliveries/invoices, and proposes openings or credit requests; Inventory Viewer reads them; Finance Owner independently approves purchases, opening valuations, supplier settlements, customer credit terms/repayments, and return COGS reversals. None of these actions executes a bank transfer directly.</p>
      </section>
      <Link href="/admin/store/procurement" className="inline-block text-sm font-medium text-cyan-700 underline">Open procurement workspace</Link>
    </main>
  );
}
