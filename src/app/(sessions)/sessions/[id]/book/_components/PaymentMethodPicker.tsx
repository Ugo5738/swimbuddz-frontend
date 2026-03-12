import { CreditCard } from "lucide-react";
import Link from "next/link";

type PaymentMethodPickerProps = {
  payWithBubbles: boolean;
  canPayWithBubbles: boolean;
  walletBalance: number | null;
  bubblesNeeded: number;
  onSelectMethod: (useBubbles: boolean) => void;
};

export function PaymentMethodPicker({
  payWithBubbles,
  canPayWithBubbles,
  walletBalance,
  bubblesNeeded,
  onSelectMethod,
}: PaymentMethodPickerProps) {
  const shortfall = walletBalance !== null ? bubblesNeeded - walletBalance : bubblesNeeded;
  const showShortfall = walletBalance !== null && !canPayWithBubbles && bubblesNeeded > 0;
  const showSetupWallet = walletBalance === null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Payment Method</p>

      {/* Segmented control */}
      <div className="flex rounded-xl border border-slate-200 overflow-hidden">
        {/* Card / Paystack */}
        <button
          type="button"
          onClick={() => onSelectMethod(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            !payWithBubbles ? "bg-cyan-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Card / Bank
        </button>

        {/* Bubbles — uses a div instead of button so child links stay clickable when disabled */}
        <div
          role="button"
          tabIndex={canPayWithBubbles ? 0 : -1}
          onClick={() => {
            if (canPayWithBubbles) onSelectMethod(true);
          }}
          onKeyDown={(e) => {
            if (canPayWithBubbles && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onSelectMethod(true);
            }
          }}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 px-4 transition-colors border-l border-slate-200 ${
            payWithBubbles
              ? "bg-cyan-600 text-white cursor-pointer"
              : canPayWithBubbles
                ? "bg-white text-slate-600 hover:bg-slate-50 cursor-pointer"
                : "bg-slate-50 text-slate-400 cursor-default"
          }`}
        >
          {/* Main label row */}
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="text-base leading-none">🫧</span>
            Bubbles
            {walletBalance !== null && (
              <span
                className={`text-xs ${
                  payWithBubbles
                    ? "text-cyan-100"
                    : canPayWithBubbles
                      ? "text-slate-400"
                      : "text-slate-300"
                }`}
              >
                ({walletBalance})
              </span>
            )}
          </span>

          {/* Inline shortfall hint */}
          {showShortfall && (
            <span className="text-[11px] text-slate-400 leading-tight">
              Need {shortfall} more ·{" "}
              <Link
                href="/account/wallet/topup"
                className="text-cyan-600 font-medium hover:text-cyan-700"
                onClick={(e) => e.stopPropagation()}
              >
                Top up
              </Link>
            </span>
          )}

          {/* No wallet hint */}
          {showSetupWallet && (
            <Link
              href="/account/wallet"
              className="text-[11px] text-cyan-600 font-medium hover:text-cyan-700 leading-tight"
              onClick={(e) => e.stopPropagation()}
            >
              Set up wallet
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
