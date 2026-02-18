"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type WalletStats = {
  total_wallets: number;
  active_wallets: number;
  frozen_wallets: number;
  total_bubbles_in_circulation: number;
  total_bubbles_spent_this_month: number;
  total_topup_revenue_naira_this_month: number;
};

type WalletSummary = {
  id: string;
  member_id: string;
  member_auth_id: string;
  member?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  balance: number;
  status: string;
  wallet_tier: string;
  created_at: string;
};

type WalletListResponse = {
  wallets: WalletSummary[];
  total: number;
  skip: number;
  limit: number;
};

// ============================================================================
// Component
// ============================================================================

const PAGE_SIZE = 20;

export default function AdminWalletPage() {
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [walletData, setWalletData] = useState<WalletListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
      });
      if (statusFilter) params.set("status", statusFilter);

      const [statsData, walletsData] = await Promise.all([
        apiGet<WalletStats>("/api/v1/admin/wallet/stats", { auth: true }),
        apiGet<WalletListResponse>(`/api/v1/admin/wallet/wallets?${params}`, {
          auth: true,
        }),
      ]);
      setStats(statsData);
      setWalletData(walletsData);
    } catch (e) {
      console.error("Failed to load wallet admin data:", e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !stats) {
    return <LoadingPage text="Loading wallet dashboard..." />;
  }

  const totalPages = walletData ? Math.ceil(walletData.total / PAGE_SIZE) : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Wallet Management</h1>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-4">
            <p className="text-xs text-slate-500">Total Wallets</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.total_wallets}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-bold text-emerald-600">
              {stats.active_wallets}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Frozen</p>
            <p className="text-2xl font-bold text-red-600">
              {stats.frozen_wallets}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Bubbles in Circulation</p>
            <p className="text-2xl font-bold text-cyan-600">
              {stats.total_bubbles_in_circulation.toLocaleString()} 🫧
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Spent This Month</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.total_bubbles_spent_this_month.toLocaleString()} 🫧
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Topup Revenue (Month)</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatNaira(stats.total_topup_revenue_naira_this_month, {
                showDecimal: false,
              })}
            </p>
          </Card>
        </div>
      )}

      {/* Wallet List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">All Wallets</h2>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="suspended">Suspended</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div className="space-y-2">
          {walletData?.wallets.map((w) => (
            <Link key={w.id} href={`/admin/wallet/${w.id}`}>
              <Card className="p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {w.member?.full_name || w.member_auth_id}
                    </p>
                    {w.member?.email && (
                      <p className="text-xs text-slate-500">{w.member.email}</p>
                    )}
                    <p className="text-xs text-slate-500">
                      Auth: {w.member_auth_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {new Date(w.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        w.status === "active"
                          ? "success"
                          : w.status === "frozen"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {w.status}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-900">
                      {w.balance.toLocaleString()} 🫧
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {walletData?.wallets.length === 0 && (
          <Card className="p-6 bg-slate-50 border-dashed text-center">
            <p className="text-slate-600">No wallets found</p>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
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
    </div>
  );
}
