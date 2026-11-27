"use client";

import {
  SOURCING_PLAYBOOKS,
  type SourcingKey,
} from "@/components/admin/store/StoreGuideData";
import {
  PaymentsAndPostPurchaseSection,
  StockDeductionTimelineSection,
  StoreDirectorySection,
  TroubleshootingSection,
} from "@/components/admin/store/StoreGuideSections";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Info } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const SOURCING_KEYS: SourcingKey[] = ["stocked", "preorder", "dropship"];

const QUICK_JUMP = [
  { id: "where-everything-lives", label: "1. Where Everything Lives" },
  { id: "before-and-after", label: "2. Before & After a Purchase" },
  { id: "when-stock-deducts", label: "3. When Stock Deducts" },
  { id: "payments-and-cases", label: "4. Payments, Returns & Refunds" },
  { id: "troubleshooting", label: "5. Common Errors & Fixes" },
];

export default function StoreOperationsGuidePage() {
  const [selectedSourcing, setSelectedSourcing] = useState<SourcingKey>("stocked");
  const playbook = SOURCING_PLAYBOOKS[selectedSourcing];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/store"
            className="text-slate-500 hover:text-slate-700 text-sm flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Store Dashboard
          </Link>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-600" />
            <h1 className="text-2xl font-bold text-slate-900">Store Operations Guide</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Day-one handbook for managing products, stock, preorders, fulfillment, returns, and
            refunds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/store/orders"
            className="px-3.5 py-2 text-sm font-medium bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Go to Orders
          </Link>
          <Link
            href="/admin/store/cases"
            className="px-3.5 py-2 text-sm font-medium bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Returns &amp; Cases
          </Link>
        </div>
      </div>

      {/* Quick Jump Bar */}
      <Card className="p-3 bg-slate-50/80 border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-2">
            Jump to:
          </span>
          {QUICK_JUMP.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:border-cyan-400 hover:text-cyan-700 transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </Card>

      {/* Section 1: Where Everything Lives */}
      <StoreDirectorySection />

      {/* Section 2: Interactive Before & After Playbook by Sourcing Type */}
      <section id="before-and-after" className="scroll-mt-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              2. What to Do Before &amp; After a Purchase
            </h2>
            <p className="text-sm text-slate-500">
              Choose the product&apos;s sourcing type to see the exact clicks before and after an
              order comes in.
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Product sourcing type workflow"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 self-start"
          >
            {SOURCING_KEYS.map((key) => {
              const active = selectedSourcing === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedSourcing(key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    active
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {SOURCING_PLAYBOOKS[key].label}
                </button>
              );
            })}
          </div>
        </div>

        <Card className={`p-5 border ${playbook.accentClass} space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <span
                className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${playbook.badgeClass}`}
              >
                {playbook.label} Workflow
              </span>
              <p className="text-sm text-slate-700">{playbook.tagline}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Before purchase */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Before a Customer Purchases
              </h3>
              <ol className="space-y-3">
                {playbook.beforePurchase.map((item, idx) => (
                  <li key={item.step} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-slate-900">{item.step}</p>
                      <p className="text-slate-600 leading-relaxed">{item.detail}</p>
                      {item.href && item.linkLabel && (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-cyan-700 font-semibold hover:underline"
                        >
                          {item.linkLabel}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* After purchase */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                After a Customer Purchases
              </h3>
              <ol className="space-y-3">
                {playbook.afterPurchase.map((item, idx) => (
                  <li key={item.step} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-slate-900">{item.step}</p>
                      <p className="text-slate-600 leading-relaxed">{item.detail}</p>
                      {item.href && item.linkLabel && (
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1 text-cyan-700 font-semibold hover:underline"
                        >
                          {item.linkLabel}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-white/90 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700">
            <Info className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Stock &amp; accounting rule:</strong> {playbook.stockRule}
            </span>
          </div>
        </Card>

        {/* Storefront Variant Visual Legend */}
        <Card className="p-4 bg-white border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                What Customers See on Product Pages (3 Variant States)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Controlled automatically by stock count and each variant&apos;s{" "}
                <em>Continue selling when out of stock</em> toggle.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-cyan-300 bg-cyan-50/50 text-slate-800 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                In Stock (qty &gt; 0)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-amber-300 bg-amber-50 text-amber-900 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pre-order (qty 0 + backorder ON)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400 line-through">
                Out of Stock (qty 0 + backorder OFF)
              </span>
            </div>
          </div>
        </Card>
      </section>

      {/* Section 3: When Stock Deducts */}
      <StockDeductionTimelineSection />

      {/* Section 4: Payments, Cancellations, Returns & Refunds */}
      <PaymentsAndPostPurchaseSection />

      {/* Section 5: Troubleshooting */}
      <TroubleshootingSection />
    </div>
  );
}
