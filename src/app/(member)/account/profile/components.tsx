// Small presentational components extracted from page.tsx during the
// file-size sweep. Pure props-driven.

import type { DetailProps } from "./types";

export function Detail({ label, value, children, fullSpan }: DetailProps) {
  const displayValue = value && value.length > 0 ? value : "--";

  return (
    <div className={fullSpan ? "md:col-span-2" : undefined}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {children ? (
        <div className="text-sm text-slate-700">{children}</div>
      ) : (
        <p className="text-sm text-slate-700">{displayValue}</p>
      )}
    </div>
  );
}
