// Shared bits used by every PoolEditTabs sub-file. Kept private to the
// package (leading underscore) — if any of these grow beyond the tabs,
// promote to a public location.

"use client";

import { Card } from "@/components/ui/Card";
import { Users } from "lucide-react";

export const inputCls =
  "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white";

export function EmptyState({
  icon: Icon,
  label,
}: {
  icon: typeof Users;
  label: string;
}) {
  return (
    <Card className="p-8 text-center border-dashed">
      <Icon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
      <p className="text-sm text-slate-500">{label}</p>
    </Card>
  );
}

export function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.length >= 10 ? iso.slice(0, 10) : "";
}
