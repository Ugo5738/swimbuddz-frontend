// Small presentational components extracted from page.tsx during the
// file-size sweep. None of these depend on the page's state — they're
// pure props-driven and could move to `src/components/admin/` if they
// pick up reuse from another route.

import { Card } from "@/components/ui/Card";
import { SESSION_TYPE_COLORS as SHARED_TYPE_CLR } from "@/lib/sessions";
import { CheckCircle, Clock, FileEdit, XCircle } from "lucide-react";

import type { SessionType } from "./types";
import { TYPE_LABELS } from "./utils";

const TYPE_CLR = SHARED_TYPE_CLR;

export function TypeBadge({ t }: { t: string }) {
  const label = TYPE_LABELS[t as SessionType] || t;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TYPE_CLR[t] || "bg-slate-100 text-slate-600"}`}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    draft: {
      cls: "bg-amber-50 text-amber-700",
      icon: <FileEdit className="h-3 w-3" />,
      label: "Draft",
    },
    scheduled: {
      cls: "bg-green-50 text-green-700",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Scheduled",
    },
    in_progress: {
      cls: "bg-blue-50 text-blue-700",
      icon: <Clock className="h-3 w-3" />,
      label: "In Progress",
    },
    completed: {
      cls: "bg-slate-100 text-slate-600",
      icon: <CheckCircle className="h-3 w-3" />,
      label: "Completed",
    },
    cancelled: {
      cls: "bg-red-50 text-red-700",
      icon: <XCircle className="h-3 w-3" />,
      label: "Cancelled",
    },
  };
  const m = map[s] || map.scheduled;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`flex items-center gap-3 p-4 ${accent ? "ring-1 ring-amber-200" : ""} ${onClick ? "cursor-pointer hover:bg-slate-50 transition" : ""}`}
      onClick={onClick}
    >
      {icon}
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}

export function IBtn({
  children,
  title,
  className = "text-slate-500 hover:bg-slate-100",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded p-1.5 transition ${className} disabled:opacity-40`}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
