"use client";
import { useId } from "react";

export type CheckoutPaymentMethod = "paystack" | "manual_transfer";

export function PaymentMethodChoice({
  value,
  onChange,
  disabled = false,
}: {
  value: CheckoutPaymentMethod;
  onChange: (method: CheckoutPaymentMethod) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-semibold text-slate-800">Payment method</legend>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["paystack", "Pay online"],
            ["manual_transfer", "Bank transfer"],
          ] as const
        ).map(([method, label]) => (
          <label
            key={method}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm ${value === method ? "border-cyan-600 bg-cyan-50" : "border-slate-300"}`}
          >
            <input
              type="radio"
              name={name}
              checked={value === method}
              onChange={() => onChange(method)}
            />
            {label}
          </label>
        ))}
      </div>
      {value === "manual_transfer" && (
        <p className="text-sm text-amber-800">
          Continue for the exact amount, bank details and receipt submission. Access is confirmed
          only after Admin verifies payment. Bubbles cannot be combined with bank transfer.
        </p>
      )}
    </fieldset>
  );
}
