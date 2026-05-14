"use client";

import { Button } from "@/components/ui/Button";
import { KOBO_PER_NAIRA, formatNaira } from "@/lib/format";
import { CreditCard } from "lucide-react";
import { useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PaymentChoicePanelProps {
  /** Amount due for the next installment — kobo (minor NGN unit). Acts as the
   * minimum a member can pay; cannot be lowered below this. */
  amountKobo: number;
  /** Total remaining balance across all unpaid installments — kobo. Acts as
   * the maximum a member can pay in a single transaction. When omitted,
   * the custom-amount option is hidden. */
  maxPayableKobo?: number;
  enrollmentId: string;
  installmentId: string;
  /** Called when the user chooses card/bank pay. Receives the chosen amount
   * in kobo so the parent can route to checkout with the override. */
  onPayWithCard: (chosenAmountKobo: number) => void;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentChoicePanel({
  amountKobo,
  maxPayableKobo,
  enrollmentId: _enrollmentId,
  installmentId: _installmentId,
  onPayWithCard,
  isLoading = false,
}: PaymentChoicePanelProps) {
  const amountNaira = amountKobo / KOBO_PER_NAIRA;

  // ── Custom-amount UI state ──
  // Member can opt to pay more than the next installment, up to the full
  // remaining balance. Rolls forward across installments per backend policy.
  const canUseCustomAmount =
    maxPayableKobo !== undefined && maxPayableKobo > amountKobo;
  const [customOpen, setCustomOpen] = useState(false);
  const [customNairaStr, setCustomNairaStr] = useState(
    String(Math.floor(amountKobo / KOBO_PER_NAIRA)),
  );
  const customKobo = (() => {
    const naira = Number(customNairaStr);
    if (!Number.isFinite(naira) || naira <= 0) return 0;
    return Math.floor(naira * KOBO_PER_NAIRA);
  })();
  const minKobo = amountKobo;
  const maxKobo = maxPayableKobo ?? amountKobo;
  const customBelowMin = customKobo < minKobo;
  const customAboveMax = customKobo > maxKobo;
  const customValid = !customBelowMin && !customAboveMax && customKobo > 0;

  return (
    <div className="space-y-4">
      {/* ── Amount Summary ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Amount Due
        </p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">
          {formatNaira(amountNaira, { showDecimal: false })}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Cohort fees are paid by card or bank transfer.
        </p>
      </div>

      {/* ── Pay directly with card/bank ──────────────────────────────────── */}
      <div className="rounded-xl border-2 border-cyan-300 bg-cyan-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Pay with Card / Bank Transfer
              </p>
              <p className="text-xs text-slate-500">
                Securely processed by Paystack
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white"
            onClick={() => onPayWithCard(amountKobo)}
            disabled={isLoading}
          >
            Pay {formatNaira(amountNaira, { showDecimal: false })}
          </Button>
        </div>
      </div>

      {/* ── Custom amount (subtle expander) ──────────────────────────────────
          Power-user option for paying ahead or recovering from a missed
          auto-deduction. Only shown when there's a future installment to
          roll into; defaults to the next installment amount. */}
      {canUseCustomAmount && !customOpen && (
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className="block w-full text-center text-xs text-slate-400 hover:text-slate-600 hover:underline transition-colors"
        >
          Pay a different amount
        </button>
      )}

      {canUseCustomAmount && customOpen && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Custom amount
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Pay between{" "}
                {formatNaira(minKobo / KOBO_PER_NAIRA, { showDecimal: false })}
                {" and "}
                {formatNaira(maxKobo / KOBO_PER_NAIRA, { showDecimal: false })}.
                Pays this installment first, then rolls into the next.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCustomOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="flex items-stretch gap-2">
            <div className="flex items-center flex-1 rounded-lg border border-slate-200 bg-white px-3 focus-within:ring-2 focus-within:ring-cyan-400 focus-within:border-transparent">
              <span className="text-slate-500 text-sm font-medium pr-2">₦</span>
              <input
                type="number"
                inputMode="numeric"
                min={Math.ceil(minKobo / KOBO_PER_NAIRA)}
                max={Math.floor(maxKobo / KOBO_PER_NAIRA)}
                step="1"
                value={customNairaStr}
                onChange={(e) => setCustomNairaStr(e.target.value)}
                className="flex-1 py-2 text-sm bg-transparent outline-none"
              />
            </div>
            <Button
              size="sm"
              className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
              disabled={!customValid || isLoading}
              onClick={() => onPayWithCard(customKobo)}
            >
              Pay {formatNaira(customKobo / KOBO_PER_NAIRA, { showDecimal: false })}
            </Button>
          </div>

          {customBelowMin && (
            <p className="text-xs text-red-600">
              Minimum is{" "}
              {formatNaira(minKobo / KOBO_PER_NAIRA, { showDecimal: false })}
              {" "}(this installment).
            </p>
          )}
          {customAboveMax && (
            <p className="text-xs text-red-600">
              Maximum is{" "}
              {formatNaira(maxKobo / KOBO_PER_NAIRA, { showDecimal: false })}
              {" "}(your full remaining balance).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
