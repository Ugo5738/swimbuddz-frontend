"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowDownLeft, ArrowLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type WalletDetail = {
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
  lifetime_bubbles_purchased: number;
  lifetime_bubbles_spent: number;
  lifetime_bubbles_received: number;
  frozen_reason?: string | null;
  frozen_at?: string | null;
  created_at: string;
  updated_at: string;
};

type Transaction = {
  id: string;
  transaction_type: string;
  direction: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
};

type AuditEntry = {
  id: string;
  action: string;
  performed_by: string;
  reason: string;
  created_at: string;
};

type Topup = {
  id: string;
  reference: string;
  payment_reference?: string | null;
  bubbles_amount: number;
  naira_amount: number;
  status: string;
  completed_at?: string | null;
  failed_at?: string | null;
  member_auth_id: string;
  member?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
};

// ============================================================================
// Component
// ============================================================================

export default function AdminWalletDetailPage() {
  const params = useParams();
  const walletId = params.walletId as string;

  const [wallet, setWallet] = useState<WalletDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [topups, setTopups] = useState<Topup[]>([]);
  const [loading, setLoading] = useState(true);

  // Action state
  const [freezeReason, setFreezeReason] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, txnData, auditData, topupData] = await Promise.all([
        apiGet<WalletDetail>(`/api/v1/admin/wallet/wallets/${walletId}`, {
          auth: true,
        }),
        apiGet<{ transactions: Transaction[] }>(
          `/api/v1/admin/wallet/transactions?wallet_id=${walletId}&limit=20`,
          { auth: true },
        ),
        apiGet<{ entries: AuditEntry[] }>(
          `/api/v1/admin/wallet/audit-log?wallet_id=${walletId}&limit=20`,
          { auth: true },
        ),
        apiGet<{ topups: Topup[] }>(
          `/api/v1/admin/wallet/topups?wallet_id=${walletId}&limit=20`,
          { auth: true },
        ),
      ]);
      setWallet(walletData);
      setTransactions(txnData.transactions || []);
      setAuditLog(auditData.entries || []);
      setTopups(topupData.topups || []);
    } catch (e) {
      console.error("Failed to load wallet details:", e);
      toast.error("Failed to load wallet details");
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFreeze = async () => {
    if (!freezeReason || freezeReason.length < 5) {
      toast.error("Reason must be at least 5 characters");
      return;
    }
    setActionLoading(true);
    try {
      await apiPost(
        `/api/v1/admin/wallet/wallets/${walletId}/freeze`,
        { reason: freezeReason },
        { auth: true },
      );
      toast.success("Wallet frozen");
      setFreezeReason("");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to freeze wallet");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    setActionLoading(true);
    try {
      await apiPost(
        `/api/v1/admin/wallet/wallets/${walletId}/unfreeze`,
        { reason: "Admin unfroze wallet" },
        { auth: true },
      );
      toast.success("Wallet unfrozen");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to unfreeze wallet");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseInt(adjustAmount, 10);
    if (!amount || !adjustReason || adjustReason.length < 5) {
      toast.error("Enter a valid amount and reason (min 5 chars)");
      return;
    }
    setActionLoading(true);
    try {
      await apiPost(
        `/api/v1/admin/wallet/wallets/${walletId}/adjust`,
        { amount, reason: adjustReason },
        { auth: true },
      );
      toast.success(
        `Balance adjusted by ${amount > 0 ? "+" : ""}${amount} Bubbles`,
      );
      setAdjustAmount("");
      setAdjustReason("");
      await loadData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to adjust balance");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingPage text="Loading wallet..." />;
  }

  if (!wallet) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600">Wallet not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/wallet">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Wallet Details</h1>
      </div>

      {/* Wallet Info */}
      <Card className="p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Balance</p>
            <p className="text-2xl font-bold text-slate-900">
              {wallet.balance.toLocaleString()} 🫧
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <Badge
              variant={
                wallet.status === "active"
                  ? "success"
                  : wallet.status === "frozen"
                    ? "danger"
                    : "warning"
              }
            >
              {wallet.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tier</p>
            <p className="text-sm font-medium text-slate-900">
              {wallet.wallet_tier}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="text-sm text-slate-900">
              {formatDate(wallet.created_at)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Purchased</p>
            <p className="font-medium">
              {wallet.lifetime_bubbles_purchased.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Spent</p>
            <p className="font-medium">
              {wallet.lifetime_bubbles_spent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Received</p>
            <p className="font-medium">
              {wallet.lifetime_bubbles_received.toLocaleString()}
            </p>
          </div>
        </div>
        {wallet.frozen_reason && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm font-medium text-red-800">
              Frozen: {wallet.frozen_reason}
            </p>
            {wallet.frozen_at && (
              <p className="text-xs text-red-600 mt-1">
                Since {formatDate(wallet.frozen_at, { includeTime: true })}
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-slate-400 mt-3">
          Member: {wallet.member?.full_name || wallet.member_auth_id}
          {wallet.member?.email ? ` (${wallet.member.email})` : ""}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Member Auth ID: {wallet.member_auth_id}
        </p>
      </Card>

      {/* Actions */}
      <Card className="p-4 md:p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Actions</h2>
        <div className="space-y-4">
          {/* Freeze / Unfreeze */}
          {wallet.status === "active" ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                placeholder="Reason for freezing (min 5 chars)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading || freezeReason.length < 5}
                onClick={handleFreeze}
              >
                Freeze Wallet
              </Button>
            </div>
          ) : wallet.status === "frozen" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={handleUnfreeze}
            >
              Unfreeze Wallet
            </Button>
          ) : null}

          {/* Balance Adjustment */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">
              Adjust Balance
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Amount (+ to credit, - to debit)"
                className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Reason (min 5 chars)"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <Button
                size="sm"
                disabled={
                  actionLoading || !adjustAmount || adjustReason.length < 5
                }
                onClick={handleAdjust}
              >
                Adjust
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <Card className="p-4 bg-slate-50 border-dashed text-center">
            <p className="text-slate-600 text-sm">No transactions</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <Card key={txn.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {txn.direction === "credit" ? (
                      <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm text-slate-900">
                        {txn.description}
                      </p>
                      <p className="text-xs text-slate-500">
                        {txn.transaction_type} ·{" "}
                        {formatDate(txn.created_at, { includeTime: true })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      txn.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {txn.direction === "credit" ? "+" : "-"}
                    {txn.amount}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Topups */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Recent Topups
        </h2>
        {topups.length === 0 ? (
          <Card className="p-4 bg-slate-50 border-dashed text-center">
            <p className="text-slate-600 text-sm">No topups recorded</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {topups.map((topup) => (
              <Card key={topup.id} className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {topup.member?.full_name || topup.member_auth_id}
                    </p>
                    {topup.member?.email && (
                      <p className="text-xs text-slate-500">
                        {topup.member.email}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Ref: {topup.reference}
                      {topup.payment_reference
                        ? ` · Payment Ref: ${topup.payment_reference}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      +{topup.bubbles_amount.toLocaleString()} 🫧
                    </p>
                    <p className="text-xs text-slate-500">
                      ₦{topup.naira_amount.toLocaleString()} · {topup.status}
                    </p>
                    {(topup.completed_at || topup.failed_at) && (
                      <p className="text-xs text-slate-400">
                        {formatDate(
                          (topup.completed_at || topup.failed_at) as string,
                          { includeTime: true },
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Audit Log
          </h2>
          <div className="space-y-2">
            {auditLog.map((entry) => (
              <Card key={entry.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {entry.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.reason} — by {entry.performed_by}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDate(entry.created_at, { includeTime: true })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
