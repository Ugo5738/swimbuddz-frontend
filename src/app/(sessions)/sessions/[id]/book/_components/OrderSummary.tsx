import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RideShareArea } from "@/lib/sessions";
import { CreditCard, Tag } from "lucide-react";
import { useState } from "react";

type ValidatedDiscount = {
  code: string;
  amount: number;
  type: string | null;
  value: number | null;
};

type OrderSummaryProps = {
  poolFee: number;
  rideShareCost: number;
  selectedArea: RideShareArea | undefined;
  selectedPickupLocationId: string | null;
  numSeats: number;
  discountAmount: number;
  validatedDiscount: ValidatedDiscount | null;
  discountInput: string;
  validatingDiscount: boolean;
  subtotal: number;
  total: number;
  payWithBubbles: boolean;
  bubblesNeeded: number;
  isRideOnlyFlow: boolean;
  formatCurrency: (amount: number) => string;
  onDiscountInputChange: (value: string) => void;
  onApplyDiscount: () => void;
  onClearDiscount: () => void;
  // Desktop pay button props (hidden on mobile)
  processing: boolean;
  payDisabled: boolean;
  onPay: () => void;
};

export function OrderSummary({
  poolFee,
  rideShareCost,
  selectedArea,
  selectedPickupLocationId,
  numSeats,
  discountAmount,
  validatedDiscount,
  discountInput,
  validatingDiscount,
  subtotal,
  total,
  payWithBubbles,
  bubblesNeeded,
  isRideOnlyFlow,
  formatCurrency,
  onDiscountInputChange,
  onApplyDiscount,
  onClearDiscount,
  processing,
  payDisabled,
  onPay,
}: OrderSummaryProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  return (
    <Card className="p-5 space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>

      <div className="space-y-2">
        {/* Session fee line */}
        {!isRideOnlyFlow && (
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">Session Fee</span>
            <span className="text-slate-900 font-medium">{formatCurrency(poolFee)}</span>
          </div>
        )}

        {/* Ride share - waiting for pickup selection */}
        {selectedArea && !selectedPickupLocationId && (
          <div className="flex justify-between py-1.5 text-sm text-slate-400">
            <span className="italic">Ride Share ({selectedArea.ride_area_name})</span>
            <span className="text-xs mt-0.5">← select pickup</span>
          </div>
        )}

        {/* Ride share - confirmed */}
        {selectedArea && selectedPickupLocationId && (
          <div className="flex justify-between py-1.5 text-sm">
            <span className="text-slate-600">
              Ride Share ({selectedArea.ride_area_name})
              {numSeats > 1 && <span className="text-slate-400"> ×{numSeats}</span>}
            </span>
            <span className="text-slate-900 font-medium">{formatCurrency(rideShareCost)}</span>
          </div>
        )}

        {/* Discount section */}
        <div className="pt-2 border-t border-slate-100">
          {validatedDiscount ? (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-emerald-700">{validatedDiscount.code}</p>
                    <p className="text-xs text-emerald-600">
                      {validatedDiscount.type === "percentage"
                        ? `${validatedDiscount.value}% off`
                        : `${formatCurrency(validatedDiscount.value ?? 0)} off`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-emerald-700">
                    -{formatCurrency(discountAmount)}
                  </span>
                  <button
                    onClick={onClearDiscount}
                    className="p-1 rounded-full text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 transition-colors"
                    aria-label="Remove discount"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : showDiscountInput ? (
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={discountInput}
                onChange={(e) => onDiscountInputChange(e.target.value.toUpperCase())}
                placeholder="Discount code"
                className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-cyan-400 focus:border-transparent uppercase placeholder:text-slate-400"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={onApplyDiscount}
                disabled={!discountInput.trim() || validatingDiscount}
                className="flex-shrink-0"
              >
                {validatingDiscount ? "..." : "Apply"}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDiscountInput(true)}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium transition-colors"
            >
              Have a discount code?
            </button>
          )}
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-900">Total</span>
          <div className="text-right">
            {discountAmount > 0 && (
              <span className="text-sm text-slate-400 line-through mr-2">
                {formatCurrency(subtotal)}
              </span>
            )}
            <span className="text-lg font-bold text-cyan-600">
              {payWithBubbles ? `${bubblesNeeded} 🫧` : formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop pay button (hidden on mobile where sticky bar is used) */}
      <div className="hidden lg:block space-y-3 pt-2">
        <Button onClick={onPay} disabled={payDisabled || processing} size="lg" className="w-full">
          {processing ? (
            "Processing..."
          ) : (
            <span className="flex items-center justify-center gap-2">
              {payWithBubbles ? (
                <span className="text-lg leading-none">🫧</span>
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {total <= 0
                ? "Confirm Booking"
                : payWithBubbles
                  ? `Pay ${bubblesNeeded} Bubbles`
                  : `Pay ${formatCurrency(total)}`}
            </span>
          )}
        </Button>

        {total > 0 && (
          <p className="text-center text-xs text-slate-400">
            {payWithBubbles
              ? "Bubbles will be deducted from your SwimBuddz wallet."
              : "Payments are securely processed by Paystack."}
          </p>
        )}
      </div>
    </Card>
  );
}
