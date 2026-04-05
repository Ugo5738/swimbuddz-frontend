import { Button } from "@/components/ui/Button";
import { CreditCard } from "lucide-react";

type MobileStickyBarProps = {
  total: number;
  payWithBubbles: boolean;
  bubblesNeeded: number;
  effectiveBubbles?: number;
  paystackAmount?: number;
  processing: boolean;
  disabled: boolean;
  formatCurrency: (amount: number) => string;
  onPay: () => void;
};

export function MobileStickyBar({
  total,
  payWithBubbles,
  bubblesNeeded,
  effectiveBubbles,
  paystackAmount,
  processing,
  disabled,
  formatCurrency,
  onPay,
}: MobileStickyBarProps) {
  const hasPartialSplit =
    typeof effectiveBubbles === "number" &&
    typeof paystackAmount === "number" &&
    effectiveBubbles > 0 &&
    paystackAmount > 0;
  const fullBubbles =
    typeof effectiveBubbles === "number" && effectiveBubbles > 0 && (paystackAmount ?? total) <= 0;
  const usingBubbles = payWithBubbles || hasPartialSplit || fullBubbles;
  return (
    <>
      {/* Fixed bottom bar - mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center justify-between gap-3 lg:hidden z-50">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Total</p>
          <p className="text-lg font-bold text-cyan-600 leading-tight">
            {fullBubbles
              ? `${effectiveBubbles} 🫧`
              : payWithBubbles
                ? `${bubblesNeeded} 🫧`
                : formatCurrency(typeof paystackAmount === "number" ? paystackAmount : total)}
          </p>
        </div>
        <Button
          onClick={onPay}
          disabled={disabled || processing}
          size="md"
          className="shrink-0 min-w-[140px]"
        >
          {processing ? (
            "Processing..."
          ) : (
            <span className="flex items-center justify-center gap-2">
              {usingBubbles ? (
                <span className="text-base leading-none">🫧</span>
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {total <= 0
                ? "Confirm"
                : hasPartialSplit
                  ? `Pay ${formatCurrency(paystackAmount!)} + ${effectiveBubbles} 🫧`
                  : fullBubbles
                    ? `Pay ${effectiveBubbles} 🫧`
                    : payWithBubbles
                      ? `Pay ${bubblesNeeded} 🫧`
                      : `Pay ${formatCurrency(total)}`}
            </span>
          )}
        </Button>
      </div>

      {/* Spacer to prevent content from being hidden behind sticky bar */}
      <div className="h-20 lg:hidden" />
    </>
  );
}
