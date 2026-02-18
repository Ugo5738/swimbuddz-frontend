"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type Transaction = {
  id: string;
  transaction_type: string;
  direction: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  description: string;
  service_source?: string | null;
  created_at: string;
};

type TransactionList = {
  transactions: Transaction[];
  total: number;
  skip: number;
  limit: number;
};

// ============================================================================
// Helpers
// ============================================================================

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "topup", label: "Top-ups" },
  { value: "purchase", label: "Purchases" },
  { value: "refund", label: "Refunds" },
  { value: "session_fee", label: "Session Fees" },
  { value: "academy_fee", label: "Academy Fees" },
  { value: "store_purchase", label: "Store" },
  { value: "promotional_credit", label: "Promotional" },
  { value: "welcome_bonus", label: "Welcome Bonus" },
  { value: "admin_adjustment", label: "Adjustments" },
];

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  topup: "Top-up",
  purchase: "Purchase",
  refund: "Refund",
  session_fee: "Session Fee",
  event_fee: "Event Fee",
  store_purchase: "Store",
  academy_fee: "Academy Fee",
  transport_fee: "Transport",
  promotional_credit: "Promo",
  reward_credit: "Reward",
  admin_adjustment: "Adjustment",
  welcome_bonus: "Welcome Bonus",
};

// ============================================================================
// Component
// ============================================================================

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [data, setData] = useState<TransactionList | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("");

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (typeFilter) params.set("transaction_type", typeFilter);

      const result = await apiGet<TransactionList>(
        `/api/v1/wallet/transactions?${params}`,
        { auth: true },
      );
      setData(result);
    } catch (e) {
      console.error("Failed to load transactions:", e);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  if (loading && !data) {
    return <LoadingPage text="Loading transactions..." />;
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/account/wallet">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Transaction History
        </h1>
      </div>

      {/* Filter */}
      <div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {data && (
          <span className="ml-3 text-sm text-slate-500">
            {data.total} transaction{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Transaction list */}
      {data?.transactions.length === 0 ? (
        <Card className="p-6 bg-slate-50 border-dashed text-center">
          <p className="text-slate-600">No transactions found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.transactions.map((txn) => (
            <Card key={txn.id} className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-full p-2 ${
                      txn.direction === "credit"
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}
                  >
                    {txn.direction === "credit" ? (
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {txn.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-xs">
                        {TRANSACTION_TYPE_LABELS[txn.transaction_type] ||
                          txn.transaction_type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(txn.created_at, { includeTime: true })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${
                      txn.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {txn.direction === "credit" ? "+" : "-"}
                    {txn.amount} 🫧
                  </p>
                  <p className="text-xs text-slate-400">
                    Bal: {txn.balance_after} 🫧
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
