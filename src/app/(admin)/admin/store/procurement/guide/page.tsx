import Link from "next/link";

const steps = [
  ["Request purchase", "Select an existing supplier and SKU, enter the quantity and landed acquisition cost, then save a purchase draft."],
  ["Submit for review", "Submit the draft. The requesting person must not approve their own purchase. The Finance Owner checks the commercial approval."],
  ["Record delivered stock", "After goods physically arrive, enter the delivery reference, evidence and actual received quantities. The system rejects over-receipts and duplicate references."],
  ["Record supplier invoice", "An approved PO can carry supplier invoice details. This is a liability, not proof of a bank payment. Finance verifies and reconciles payment separately."],
  ["Reconcile existing stock", "For stock already on hand, propose the physical count and acquisition cost with original evidence. A different authorised Owner reviews it."],
  ["Review customer credit", "Request credit terms for an unpaid open order. Approval creates an exposure record only; the order remains unpaid and must not be fulfilled as though settled."],
];
export default function ProcurementGuidePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <header className="space-y-2">
        <Link href="/admin/store/procurement" className="text-sm font-medium text-cyan-700 underline">Back to Procurement</Link>
        <h1 className="text-3xl font-semibold text-slate-900">Store Procurement guide</h1>
        <p className="text-sm text-slate-600">For Store Procurement Officer, Inventory Viewer and Finance Owner. Purchasing, receiving stock and paying suppliers are three separate events.</p>
      </header>
      <aside className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Do not infer costs from selling prices.</strong> Unknown opening stock cost stays unvalued. Supplier payment and customer credit collection are not automated by this workflow.
      </aside>
      <ol className="space-y-3">
        {steps.map(([title, body], i) => <li key={title} className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{i + 1}. {title}</h2>
          <p className="mt-1 text-sm text-slate-600">{body}</p>
        </li>)}
      </ol>
      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Access and approvals</h2>
        <p className="mt-2 text-sm text-slate-600">Procurement Officer prepares purchases and records deliveries; Inventory Viewer reads them; Finance Owner independently approves purchases, historic opening values and customer credit terms. None of these actions gives a Store user bank access.</p>
        <p className="mt-2 text-sm text-slate-600">Inventory valuation uses a moving weighted-average cost from verified acquisitions. Returns, refunds and historic stock need finance reconciliation before profit is final.</p>
      </section>
      <Link href="/admin/store/procurement" className="inline-block text-sm font-medium text-cyan-700 underline">Open procurement workspace</Link>
    </main>
  );
}
