"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { apiGet, apiPost } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { ArrowDownLeft, ArrowUpRight, Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

type WalletData = {
  id: string;
  balance: number;
  status: string;
  wallet_tier: string;
  lifetime_bubbles_purchased: number;
  lifetime_bubbles_spent: number;
  lifetime_bubbles_received: number;
  frozen_reason?: string | null;
  created_at: string;
};

type Transaction = {
  id: string;
  transaction_type: string;
  direction: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: string;
  description: string;
  created_at: string;
};

type TransactionList = {
  transactions: Transaction[];
  total: number;
};

type TopupReconcileResponse = {
  id: string;
  reference: string;
  bubbles_amount: number;
  status: string;
};

type WalletIntroContext = {
  welcome_bonus_granted?: boolean;
  welcome_bonus_amount?: number;
  balance?: number;
};

// ============================================================================
// Helpers
// ============================================================================

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

function transactionTypeLabel(type: string): string {
  return TRANSACTION_TYPE_LABELS[type] || type;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "frozen":
      return "danger" as const;
    case "suspended":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function CoachWalletPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnReference =
    searchParams.get("reference") || searchParams.get("trxref");
  const returnTopupId = searchParams.get("topup");
  const showWelcomeParam = searchParams.get("welcome") === "1";
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [noWallet, setNoWallet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reconcilingReturn, setReconcilingReturn] = useState(false);
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(false);
  const [welcomeIntroContext, setWelcomeIntroContext] =
    useState<WalletIntroContext | null>(null);
  const handledReturnKeyRef = useRef<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, txnData] = await Promise.all([
        apiGet<WalletData>("/api/v1/wallet/me", { auth: true }),
        apiGet<TransactionList>("/api/v1/wallet/transactions?limit=10", {
          auth: true,
        }),
      ]);
      setWallet(walletData);
      setTransactions(txnData.transactions);
      setNoWallet(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("not found") || msg.includes("404")) {
        setNoWallet(true);
      } else {
        console.error("Failed to load wallet:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    let fallbackReference: string | null = null;
    try {
      const raw = localStorage.getItem("wallet_topup_pending");
      if (raw) {
        const parsed = JSON.parse(raw) as {
          reference?: string;
          saved_at?: number;
        };
        const stillFresh =
          typeof parsed.saved_at !== "number" ||
          Date.now() - parsed.saved_at < 24 * 60 * 60 * 1000;
        if (stillFresh && parsed.reference) {
          fallbackReference = parsed.reference;
        }
      }
    } catch {
      // ignore parsing/storage issues
    }

    const topupReference = returnReference || fallbackReference;
    const handledKey = `${topupReference || "none"}|${returnTopupId || "none"}`;
    if (!topupReference && !returnTopupId) return;
    if (handledReturnKeyRef.current === handledKey) {
      setReconcilingReturn(false);
      router.replace(pathname);
      return;
    }
    handledReturnKeyRef.current = handledKey;

    let cancelled = false;
    const reconcile = async () => {
      setReconcilingReturn(true);
      try {
        let topup: TopupReconcileResponse | null = null;
        for (let attempt = 0; attempt < 8; attempt += 1) {
          if (cancelled) return;

          if (topupReference) {
            topup = await apiPost<TopupReconcileResponse>(
              `/api/v1/wallet/topups/reconcile/${encodeURIComponent(topupReference)}`,
              undefined,
              { auth: true },
            );
          } else if (returnTopupId) {
            topup = await apiGet<TopupReconcileResponse>(
              `/api/v1/wallet/topup/${encodeURIComponent(returnTopupId)}`,
              { auth: true },
            );
          }

          if (!topup || topup.status === "completed" || topup.status === "failed") {
            break;
          }
          await new Promise<void>((resolve) => setTimeout(resolve, 2000));
        }

        if (cancelled) return;

        router.replace(pathname);

        if (topup?.status === "completed") {
          toast.success(`Top-up successful! +${topup.bubbles_amount} Bubbles added.`);
          try {
            localStorage.removeItem("wallet_topup_pending");
          } catch {
            // ignore storage errors
          }
        } else if (topup?.status === "failed") {
          toast.error("Payment was not successful. Please try again.");
          try {
            localStorage.removeItem("wallet_topup_pending");
          } catch {
            // ignore storage errors
          }
        } else {
          toast("Payment received. Confirming your top-up...");
        }

        await Promise.race([
          loadWallet(),
          new Promise<void>((resolve) => setTimeout(resolve, 5000)),
        ]);
      } catch (e) {
        if (!cancelled) {
          toast.error(
            e instanceof Error ? e.message : "Could not confirm top-up yet.",
          );
          router.replace(pathname);
          await loadWallet();
        }
      } finally {
        if (!cancelled) {
          setReconcilingReturn(false);
        }
      }
    };

    reconcile();
    return () => {
      cancelled = true;
      setReconcilingReturn(false);
    };
  }, [loadWallet, pathname, returnReference, returnTopupId, router]);

  useEffect(() => {
    if (showWelcomeParam) {
      setShowWelcomeIntro(true);
    }
    try {
      const raw = localStorage.getItem("wallet_intro_pending");
      if (!raw) return;
      const parsed = JSON.parse(raw) as WalletIntroContext & {
        created_at?: number;
      };
      if (
        parsed.created_at &&
        Date.now() - parsed.created_at > 24 * 60 * 60 * 1000
      ) {
        localStorage.removeItem("wallet_intro_pending");
        return;
      }
      setWelcomeIntroContext(parsed);
      setShowWelcomeIntro(true);
    } catch {
      // ignore parsing/storage issues
    }
  }, [showWelcomeParam]);

  const dismissWelcomeIntro = () => {
    setShowWelcomeIntro(false);
    try {
      localStorage.removeItem("wallet_intro_pending");
    } catch {
      // ignore storage errors
    }
  };

  const handleCreateWallet = async () => {
    setCreating(true);
    try {
      await apiPost("/api/v1/wallet/create", {}, { auth: true });
      toast.success("Wallet created successfully.");
      await loadWallet();
    } catch (e) {
      toast.error("Failed to create wallet");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingPage text="Loading your wallet..." />;
  }

  // No wallet state
  if (noWallet) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <Card className="p-8 text-center">
          <div className="text-5xl mb-4">🫧</div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Create Your Bubble Wallet
          </h2>
          <p className="text-slate-600 mb-6 max-w-md mx-auto">
            Use Bubbles to pay for sessions, academy programs, events, and more.
          </p>
          <Button onClick={handleCreateWallet} disabled={creating}>
            {creating ? "Creating..." : "Create Wallet"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {showWelcomeIntro && (
        <Card className="p-4 md:p-5 bg-emerald-50 border border-emerald-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-emerald-900">
                Welcome to your Bubble wallet
              </p>
              <p className="text-sm text-emerald-800">
                {welcomeIntroContext?.welcome_bonus_granted
                  ? `You received +${welcomeIntroContext.welcome_bonus_amount || 0} welcome Bubbles. `
                  : "Your wallet is active. "}
                Use Bubbles for sessions, events, and store purchases.
              </p>
              <p className="text-xs text-emerald-700">
                Start here: check your balance, view transactions, or add more
                Bubbles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/coach/wallet/topup">
                <Button size="sm">Add Bubbles</Button>
              </Link>
              <Link href="/coach/wallet/transactions">
                <Button size="sm" variant="outline">
                  View Transactions
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={dismissWelcomeIntro}>
                Got it
              </Button>
            </div>
          </div>
        </Card>
      )}

      {reconcilingReturn && (
        <Card className="p-3 bg-cyan-50 border border-cyan-200">
          <p className="text-sm text-cyan-800">Confirming your top-up...</p>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <Link href="/coach/wallet/topup">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Bubbles
          </Button>
        </Link>
      </div>

      {/* Frozen banner */}
      {wallet?.status === "frozen" && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="font-medium text-red-800">Wallet Frozen</p>
          <p className="text-sm text-red-600 mt-1">
            {wallet.frozen_reason ||
              "Your wallet has been temporarily suspended. Please contact support."}
          </p>
        </div>
      )}

      {/* Balance Card */}
      <Card className="p-5 md:p-6 bg-gradient-to-br from-cyan-50 to-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-cyan-600">Bubble Balance</p>
            <p className="mt-1 text-3xl md:text-4xl font-bold text-slate-900">
              {wallet?.balance?.toLocaleString() ?? 0}
              <span className="text-lg ml-1">🫧</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ≈ ₦{((wallet?.balance ?? 0) * 100).toLocaleString()}
            </p>
          </div>
          <Badge variant={statusBadgeVariant(wallet?.status ?? "")}>
            {wallet?.status}
          </Badge>
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 md:p-4 text-center">
          <p className="text-xs text-slate-500">Purchased</p>
          <p className="text-lg font-semibold text-slate-900">
            {wallet?.lifetime_bubbles_purchased?.toLocaleString() ?? 0}
          </p>
        </Card>
        <Card className="p-3 md:p-4 text-center">
          <p className="text-xs text-slate-500">Spent</p>
          <p className="text-lg font-semibold text-slate-900">
            {wallet?.lifetime_bubbles_spent?.toLocaleString() ?? 0}
          </p>
        </Card>
        <Card className="p-3 md:p-4 text-center">
          <p className="text-xs text-slate-500">Received</p>
          <p className="text-lg font-semibold text-slate-900">
            {wallet?.lifetime_bubbles_received?.toLocaleString() ?? 0}
          </p>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Transactions
          </h2>
          <Link
            href="/coach/wallet/transactions"
            className="text-sm text-cyan-600 hover:text-cyan-700"
          >
            View all
          </Link>
        </div>

        {transactions.length === 0 ? (
          <Card className="p-6 bg-slate-50 border-dashed text-center">
            <Receipt className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600">No transactions yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <Card key={txn.id} className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${txn.direction === "credit"
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
                      <p className="text-xs text-slate-500">
                        {transactionTypeLabel(txn.transaction_type)} ·{" "}
                        {formatDate(txn.created_at)}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-semibold ${txn.direction === "credit"
                        ? "text-emerald-600"
                        : "text-red-600"
                      }`}
                  >
                    {txn.direction === "credit" ? "+" : "-"}
                    {txn.amount} 🫧
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
