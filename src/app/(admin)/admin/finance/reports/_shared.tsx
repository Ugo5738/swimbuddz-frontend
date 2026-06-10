import { formatNaira } from "@/lib/format";

// ============================================================================
// Shared helpers and presentational bits for the finance report sections.
// ============================================================================

/** Ledger amounts are integer kobo; display as Naira. */
export const naira = (kobo: number) => formatNaira(kobo / 100);

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthStartISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "positive" | "negative";
}) {
  const color =
    emphasis === "positive"
      ? "text-emerald-600"
      : emphasis === "negative"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
