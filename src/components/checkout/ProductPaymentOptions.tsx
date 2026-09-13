"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import type { ChargePreview } from "@/lib/clubOnboarding";
import { BubblesSlider } from "./BubblesSlider";

export type PaymentAdjustments = { discount_code?: string; bubbles_to_apply?: number };
type Props = {
  quote: Pick<
    ChargePreview,
    | "subtotal_kobo"
    | "discount_code"
    | "discount_kobo"
    | "discount_allocations_kobo"
    | "net_subtotal_kobo"
    | "bubbles_to_apply"
    | "bubbles_value_kobo"
  >;
  value: PaymentAdjustments;
  onChange: (value: PaymentAdjustments) => void;
  online?: boolean;
  member?: boolean;
  disabled?: boolean;
  error?: string | null;
};
const labels: Record<string, string> = {
  club: "Club",
  community: "annual Membership",
  academy_cohort: "Academy",
  community_experience: "Community Experience",
  community_experience_bundle: "bundled Community Experience",
};

export function ProductPaymentOptions({
  quote,
  value,
  onChange,
  online = true,
  member = true,
  disabled = false,
  error,
}: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [input, setInput] = useState(value.discount_code || "");
  const [showCode, setShowCode] = useState(!!value.discount_code);
  useEffect(() => {
    setInput(value.discount_code || "");
  }, [value.discount_code]);
  useEffect(() => {
    let active = true;
    if (member)
      apiGet<{ balance: number; available_balance?: number }>("/api/v1/wallet/me", { auth: true })
        .then((wallet) => {
          if (active) setBalance(wallet.available_balance ?? wallet.balance);
        })
        .catch(() => {
          if (active) setBalance(null);
        });
    return () => {
      active = false;
    };
  }, [member]);
  if (quote.subtotal_kobo <= 0) return null;
  return (
    <div className="space-y-3 border-t border-slate-100 pt-4">
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {showCode || value.discount_code ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-sm">
            Discount code
            <input
              value={input}
              disabled={disabled}
              onChange={(e) => setInput(e.target.value)}
              className="mt-1 block w-full rounded-lg border p-2 uppercase"
            />
          </label>
          <button
            type="button"
            disabled={disabled || !input.trim()}
            onClick={() =>
              onChange({ discount_code: input.trim().toUpperCase(), bubbles_to_apply: 0 })
            }
            className="rounded-lg border px-3 py-2 text-sm text-cyan-700"
          >
            Apply code
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setInput("");
              setShowCode(false);
              onChange({ bubbles_to_apply: 0 });
            }}
            className="px-2 py-2 text-sm"
          >
            Remove code
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowCode(true)}
          className="text-sm text-cyan-700 underline"
        >
          Have a discount code?
        </button>
      )}
      {(quote.discount_kobo ?? 0) > 0 && (
        <p className="text-sm text-emerald-700">
          Discount {quote.discount_code}: −₦{((quote.discount_kobo || 0) / 100).toLocaleString()}
          <span className="block text-xs">
            Applies to{" "}
            {Object.keys(quote.discount_allocations_kobo || {})
              .map((key) => labels[key] || key)
              .join(", ")}
          </span>
        </p>
      )}
      {member && online && balance != null && balance > 0 && (
        <fieldset disabled={disabled}>
          <BubblesSlider
            amountDueNgn={(quote.net_subtotal_kobo ?? quote.subtotal_kobo) / 100}
            walletBalance={balance}
            bubblesToApply={value.bubbles_to_apply || 0}
            onChange={(bubbles_to_apply) => onChange({ ...value, bubbles_to_apply })}
          />
        </fieldset>
      )}
      {(quote.bubbles_to_apply ?? 0) > 0 && (
        <p className="text-sm text-cyan-700">
          {quote.bubbles_to_apply} Bubbles: −₦
          {((quote.bubbles_value_kobo || 0) / 100).toLocaleString()}
        </p>
      )}
      {(quote.discount_allocations_kobo?.academy_cohort ?? 0) > 0 && (
        <p className="text-xs text-slate-500">
          This discount applies to today's Academy payment only. Future installments are not
          discounted automatically.
        </p>
      )}
      {member && !online && (
        <p className="text-xs text-slate-500">
          Choose online payment to apply Bubbles. Bank transfers cannot be combined with Bubbles.
        </p>
      )}
    </div>
  );
}
