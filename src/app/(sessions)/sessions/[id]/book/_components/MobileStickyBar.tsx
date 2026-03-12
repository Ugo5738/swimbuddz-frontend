import { Button } from "@/components/ui/Button";
import { CreditCard } from "lucide-react";

type MobileStickyBarProps = {
  total: number;
  payWithBubbles: boolean;
  bubblesNeeded: number;
  processing: boolean;
  disabled: boolean;
  formatCurrency: (amount: number) => string;
  onPay: () => void;
};

export function MobileStickyBar({
  total,
  payWithBubbles,
  bubblesNeeded,
  processing,
  disabled,
  formatCurrency,
  onPay,
}: MobileStickyBarProps) {
  return (
    <>
      {/* Fixed bottom bar - mobile only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 flex items-center justify-between gap-3 lg:hidden z-50">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-medium">Total</p>
          <p className="text-lg font-bold text-cyan-600 leading-tight">
            {payWithBubbles ? `${bubblesNeeded} 🫧` : formatCurrency(total)}
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
              {payWithBubbles ? (
                <span className="text-base leading-none">🫧</span>
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {total <= 0
                ? "Confirm"
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
