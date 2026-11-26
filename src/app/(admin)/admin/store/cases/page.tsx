"use client";

import { AdminOrderCasesSection } from "@/components/admin/store/AdminOrderCasesSection";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import type { OrderCase } from "@/lib/storeOrderLifecycle";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface CasesListResponse {
  items: OrderCase[];
  total: number;
  page: number;
  page_size: number;
}

export default function AdminStoreCasesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const params = new URLSearchParams();
  if (statusFilter) params.set("status", statusFilter);
  if (typeFilter) params.set("case_type", typeFilter);
  params.set("page_size", "50");

  const { data, loading, refetch } = useApi<CasesListResponse>(
    `/api/v1/admin/store/cases?${params.toString()}`
  );

  const cases = data?.items ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/store"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Store Dashboard
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Admin · Store Post-Purchase
          </p>
          <h1 className="text-2xl font-bold text-slate-900">
            Cancellations, Returns &amp; Defect Claims
          </h1>
          <p className="text-slate-500 text-sm">
            Review customer requests (target: 1 business day), inspect physical returns, and trigger
            Paystack or verified bank refunds.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/payments?tab=refunds">
            <Button variant="secondary" size="sm">
              View Refund Payouts →
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="awaiting_return">Awaiting Return</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="declined">Declined</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">All Request Types</option>
          <option value="cancel_request">Cancellation Request</option>
          <option value="return_exchange">7-Day Return / Exchange</option>
          <option value="defect_claim">Defect / Wrong Item Claim</option>
          <option value="variant_swap">Variant Swap</option>
        </select>

        <span className="text-xs text-slate-500 ml-auto">{data?.total ?? 0} total cases</span>
      </Card>

      {loading ? (
        <LoadingCard text="Loading store cases..." />
      ) : (
        <AdminOrderCasesSection
          cases={cases}
          onUpdated={refetch}
          showOrderLinks={true}
        />
      )}
    </div>
  );
}
