"use client";

import { Button } from "@/components/ui/Button";
import {
  KOBO_PER_NAIRA,
  formatBubbles,
  formatBubblesFromKobo,
  formatNaira,
  koboBubbles
} from "@/lib/format";
import { CreditCard, Wallet, Zap } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentChoicePanelProps {
  /** Amount due — stored in kobo (minor NGN unit) */
  amountKobo: number;
  /** Caller's current wallet balance in Bubbles */
  walletBalanceBubbles: number;
  enrollmentId: string;
  installmentId: string;
  /** Called when the user confirms "Pay with Wallet" */
  onPayWithWallet: () => Promise<void>;
  /** Called when the user chooses direct card/bank pay */
  onPayWithCard: () => void;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentChoicePanel({
  amountKobo,
  walletBalanceBubbles,
  enrollmentId,
  installmentId,
  onPayWithWallet,
  onPayWithCard,
  isLoading = false,
}: PaymentChoicePanelProps) {
  const amountBubbles = koboBubbles(amountKobo);
  const amountNaira = amountKobo / KOBO_PER_NAIRA;
  const hasSufficientBalance = walletBalanceBubbles >= amountBubbles;
  const shortfallBubbles = hasSufficientBalance
    ? 0
    : amountBubbles - walletBalanceBubbles;

  // Pre-filled top-up URL so the user lands on topup page with exact shortfall
  const returnTo = `/account/academy/enrollments/${enrollmentId}`;
  const topupUrl = `/account/wallet/topup?prefill=${shortfallBubbles}&return_to=${encodeURIComponent(returnTo)}`;

  return (
    <div className="space-y-4">
      {/* ── Amount Summary ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: amount due */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Amount Due
            </p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900">
              {formatNaira(amountNaira, { showDecimal: false })}
            </p>
            <p className="text-sm text-slate-400">
              {formatBubblesFromKobo(amountKobo)}
            </p>
          </div>

          {/* Right: wallet balance */}
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Your Wallet
            </p>
            <p className="mt-0.5 text-xl font-semibold text-slate-900">
              {formatBubbles(walletBalanceBubbles)}
            </p>
            {hasSufficientBalance ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ✅ Covered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                ⚠️ Short {formatBubbles(shortfallBubbles)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Action 1: Pay with Wallet ─────────────────────────────────────── */}
      <div
        className={`rounded-xl border-2 p-4 transition-colors ${
          hasSufficientBalance
            ? "border-cyan-300 bg-cyan-50"
            : "border-slate-200 bg-white opacity-60"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-cyan-600">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Pay with Wallet
              </p>
              <p className="text-xs text-slate-500">
                {hasSufficientBalance
                  ? `Deduct ${formatBubbles(amountBubbles)} from your balance`
                  : `Need ${formatBubbles(shortfallBubbles)} more`}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white"
            disabled={!hasSufficientBalance || isLoading}
            onClick={onPayWithWallet}
          >
            {isLoading ? "Paying…" : `Pay ${formatBubbles(amountBubbles)}`}
          </Button>
        </div>
      </div>

      {/* ── Action 2: Top up shortfall + Pay (only when balance insufficient) */}
      {!hasSufficientBalance && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Add {formatBubbles(shortfallBubbles)} &amp; Pay
                </p>
                <p className="text-xs text-slate-500">
                  Top up the shortfall, then come back to pay
                </p>
              </div>
            </div>
            <a href={topupUrl} className="shrink-0">
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Top Up
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* ── Action 3: Pay directly with card/bank ────────────────────────── */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Pay with Card / Bank Transfer
              </p>
              <p className="text-xs text-slate-500">
                Securely via Paystack — no Bubbles needed
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={onPayWithCard}
            disabled={isLoading}
          >
            Pay{" "}
            {formatNaira(amountNaira, { showDecimal: false })}
          </Button>
        </div>
      </div>
    </div>
  );
}
