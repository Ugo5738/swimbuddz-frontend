"use client";

import { Button } from "@/components/ui/Button";
import { ArrowRight, X } from "lucide-react";

type MultiSelectBarProps = {
  count: number;
  totalNgn: number;
  onCheckout: () => void;
  onClear: () => void;
  busy?: boolean;
};

function formatNgn(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function MultiSelectBar({
  count,
  totalNgn,
  onCheckout,
  onClear,
  busy = false,
}: MultiSelectBarProps) {
  if (count === 0) return null;

  const itemLabel = count === 1 ? "session" : "sessions";

  return (
    <>
      {/* Spacer so content isn't hidden behind sticky bar */}
      <div className="h-20" aria-hidden="true" />

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white shadow-lg md:left-64 lg:left-72">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onClear}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
                aria-label="Clear selection"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {count} {itemLabel} selected · {formatNgn(totalNgn)}
                </p>
                <p className="text-xs text-slate-500">
                  Pool fees only — add ride share on next page
                </p>
              </div>
            </div>
            <Button size="md" onClick={onCheckout} disabled={busy}>
              {busy ? "Loading..." : "Proceed"}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
