"use client";

/**
 * BubblesSlider — reusable partial-Bubbles payment control.
 *
 * 1 Bubble = ₦100 exchange rate.
 * User selects how many Bubbles to apply; remaining balance is charged via
 * Paystack. If slider is at max, payment can be covered entirely by Bubbles.
 */

type BubblesSliderProps = {
  /** Total amount due before any Bubbles are applied (in ₦). */
  amountDueNgn: number;
  /** User's wallet balance in Bubbles. */
  walletBalance: number;
  /** Current number of Bubbles selected to apply. */
  bubblesToApply: number;
  /** Handler when slider or quick-button changes the applied Bubbles. */
  onChange: (bubbles: number) => void;
};

const BUBBLE_TO_NGN = 100; // 1 Bubble = ₦100

export function BubblesSlider({
  amountDueNgn,
  walletBalance,
  bubblesToApply,
  onChange,
}: BubblesSliderProps) {
  const maxBubbles = Math.max(0, walletBalance);
  const maxBubblesNeeded = Math.ceil(amountDueNgn / BUBBLE_TO_NGN);
  const sliderMax = Math.min(maxBubbles, maxBubblesNeeded);
  const effectiveBubbles = Math.min(bubblesToApply, sliderMax);
  const bubblesValueNgn = effectiveBubbles * BUBBLE_TO_NGN;

  if (maxBubbles <= 0) return null;

  return (
    <div className="rounded-xl border-2 border-cyan-200 bg-cyan-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">🫧</span>
          <p className="font-semibold text-slate-900">Apply Bubbles</p>
        </div>
        <span className="text-xs text-slate-500">
          Balance: {maxBubbles.toLocaleString()} 🫧
        </span>
      </div>

      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={sliderMax}
          value={effectiveBubbles}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-cyan-700">
            {effectiveBubbles} 🫧 = ₦{bubblesValueNgn.toLocaleString()}
          </span>
          <span className="text-slate-500">of {sliderMax} max</span>
        </div>
      </div>

      {/* Quick-apply buttons */}
      <div className="flex gap-2">
        {[0, 25, 50, 100].map((pct) => {
          const amount =
            pct === 0 ? 0 : Math.ceil((sliderMax * pct) / 100);
          return (
            <button
              key={pct}
              type="button"
              onClick={() => onChange(amount)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                effectiveBubbles === amount
                  ? "bg-cyan-500 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-cyan-300"
              }`}
            >
              {pct === 0 ? "None" : `${pct}%`}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const BUBBLES_TO_NGN_RATE = BUBBLE_TO_NGN;
