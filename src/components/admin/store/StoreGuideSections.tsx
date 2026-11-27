"use client";

import { Card } from "@/components/ui/Card";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { STORE_SCREEN_DIRECTORY, TROUBLESHOOTING_ITEMS } from "./StoreGuideData";

export function StoreDirectorySection() {
  return (
    <section id="where-everything-lives" className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">1. Where Everything Lives</h2>
        <p className="text-sm text-slate-500">
          Every daily Store task happens across these seven screens — bookmark this mental map on
          day one.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {STORE_SCREEN_DIRECTORY.map((screen) => (
          <Link key={screen.href + screen.title} href={screen.href} className="group">
            <Card className="p-4 h-full flex flex-col justify-between hover:border-cyan-300 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-sm text-slate-900 group-hover:text-cyan-700">
                    {screen.title}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                    {screen.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{screen.whenToUse}</p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">
                Open screen
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function StockDeductionTimelineSection() {
  return (
    <section id="when-stock-deducts" className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          3. When Does Stock Actually Get Deducted?
        </h2>
        <p className="text-sm text-slate-500">
          Understanding the difference between <strong>Reserved</strong> and{" "}
          <strong>On-Hand</strong> prevents 90% of stock confusion.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-t-4 border-t-cyan-500 space-y-2">
          <div className="flex items-center gap-2 text-cyan-700 font-semibold text-sm">
            <ClipboardCheck className="w-4 h-4" />
            Stage 1 · Checkout
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            For <strong>Stocked</strong> items, checkout immediately sets{" "}
            <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">Reserved +qty</code> so
            Available drops and nobody else can buy that unit. Physical{" "}
            <strong>On-Hand does not drop yet</strong> because the item is still in your bag/shelf.
          </p>
          <p className="text-[11px] text-slate-500">
            Preorders leave Reserved at 0 at checkout and join the FIFO queue when stock arrives.
          </p>
        </Card>

        <Card className="p-5 border-t-4 border-t-purple-500 space-y-2">
          <div className="flex items-center gap-2 text-purple-700 font-semibold text-sm">
            <Truck className="w-4 h-4" />
            Stage 2 · Packing &amp; Transit
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Moving through <strong>Paid → Processing → Ready for Pickup</strong> (or{" "}
            <strong>Shipped</strong>) notifies the customer and keeps the unit reserved. If an order
            is cancelled before handover, the reservation releases cleanly back to Available (and
            auto-allocates FIFO to any waiting paid preorder).
          </p>
        </Card>

        <Card className="p-5 border-t-4 border-t-emerald-500 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
            <PackageCheck className="w-4 h-4" />
            Stage 3 · Handover (Deduction!)
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Clicking <strong>Picked Up</strong> (pickup) or <strong>Delivered</strong> (delivery) is
            the moment physical stock leaves SwimBuddz. Both{" "}
            <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">On-Hand −qty</code> and{" "}
            <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">Reserved −qty</code> drop
            together, and moving-average COGS posts to Finance.
          </p>
        </Card>
      </div>

      {/* Pickup vs Delivery Click-Path Callout */}
      <Card className="p-4 bg-slate-50 border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-900 mb-1">Pickup Order Click Path</p>
            <p className="text-slate-600">
              <span className="font-medium text-emerald-700">Paid</span> →{" "}
              <span className="font-medium text-blue-700">Processing</span> →{" "}
              <span className="font-medium text-purple-700">Ready for Pickup</span>{" "}
              <span className="text-slate-400">(emails customer)</span> →{" "}
              <span className="font-medium text-slate-900">Picked Up</span>{" "}
              <span className="text-slate-400">(deducts stock)</span>
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">Delivery Order Click Path</p>
            <p className="text-slate-600">
              <span className="font-medium text-emerald-700">Paid</span> →{" "}
              <span className="font-medium text-blue-700">Processing</span> →{" "}
              <span className="font-medium text-cyan-700">Shipped</span>{" "}
              <span className="text-slate-400">(add tracking # first)</span> →{" "}
              <span className="font-medium text-slate-900">Delivered</span>{" "}
              <span className="text-slate-400">(deducts stock)</span>
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}

export function PaymentsAndPostPurchaseSection() {
  return (
    <section id="payments-and-cases" className="scroll-mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          4. Payments, Cancellations, Returns &amp; Refunds
        </h2>
        <p className="text-sm text-slate-500">
          What the system handles automatically vs. where an admin needs to click.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payments */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Payment Verification Rules
            </h3>
            <Link
              href="/admin/payments"
              className="text-xs font-semibold text-cyan-700 hover:underline"
            >
              Open Payments →
            </Link>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Paystack, Bubbles, or Store Credit:</strong> Auto-verified. Order moves to{" "}
                <strong>Paid</strong> with zero admin work.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Manual Bank Transfer:</strong> Customer uploads receipt (staged as{" "}
                <em>Pending Review</em>). Open <strong>Admin → Payments</strong>, confirm actual
                credit on your bank statement, and click <strong>Approve</strong> with the bank
                reference.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Golden Rule:</strong> Never mark an order Paid or cancel a Paid order from
                the Store status dropdown. Use <strong>Admin → Payments</strong> to verify cash and{" "}
                <strong>Cancel &amp; Issue Refund</strong> on Order Detail to cancel paid orders.
              </span>
            </li>
          </ul>
        </Card>

        {/* Post-purchase Cases & Refunds */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <RotateCcw className="w-4 h-4 text-cyan-600" />
              Cancellations, Returns &amp; Refunds
            </h3>
            <Link
              href="/admin/store/cases"
              className="text-xs font-semibold text-cyan-700 hover:underline"
            >
              Open Cases →
            </Link>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Automatic (0 admin clicks):</strong> Customer self-cancels a{" "}
                <em>Stocked</em> order before <em>Processing</em>, or swaps a same-price size/colour
                before prep. Stock releases, Bubbles/Store Credit restore, and Paystack refunds
                auto-initiate.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <ClipboardCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Admin Review (1-business-day SLA in Returns &amp; Cases):</strong> Preorder
                cancellations, cancellations after <em>Processing</em>, partial cancels, 7-day
                returns/exchanges (unused; swimwear must keep hygiene seal &amp; tags intact), and
                FCCPA defect/wrong-item claims (always eligible for full cash refund incl. delivery
                fee or free replacement).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Receiving a physical return:</strong> Always record inspection condition:{" "}
                <strong>Restockable</strong> (adds back to On-Hand, auto-allocates FIFO, reverses
                COGS) vs. <strong>Damaged</strong> / <strong>Hygiene Unsellable</strong> (never
                re-added to sellable stock).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Banknote className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bank-transfer cash refunds:</strong> Open{" "}
                <Link href="/admin/payments?tab=refunds" className="text-cyan-700 underline">
                  Admin → Payments → Refunds &amp; Payouts
                </Link>
                , run live NUBAN verification, send the bank transfer, and enter the corporate bank
                reference to complete.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </section>
  );
}

export function TroubleshootingSection() {
  return (
    <section id="troubleshooting" className="scroll-mt-6 space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          5. If You See This Error, Do This
        </h2>
        <p className="text-sm text-slate-500">
          The Store enforces financial and inventory guardrails automatically — here is how to
          resolve the most common alerts in seconds.
        </p>
      </div>

      <div className="space-y-3">
        {TROUBLESHOOTING_ITEMS.map((item) => (
          <Card key={item.symptom} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-slate-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{item.symptom}</span>
                </p>
                <p className="text-xs text-slate-500 pl-6">
                  <strong>Why:</strong> {item.cause}
                </p>
                <p className="text-xs text-slate-700 pl-6">
                  <strong>Fix:</strong> {item.fix}
                </p>
              </div>
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 self-start px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                {item.linkLabel}
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
