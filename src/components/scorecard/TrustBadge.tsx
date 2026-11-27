"use client";

import type {
  SkillProficiency,
  VerificationSource,
  VerificationStatus,
} from "@/lib/scorecard";
import { PROFICIENCY_LABELS } from "@/lib/scorecard";
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";

export function TrustBadge({
  source,
  compact = false,
}: {
  source: VerificationSource;
  compact?: boolean;
}) {
  if (source === "coach_verified") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
        title="Verified by a Coach, Pod Lead, or SwimBuddz assessment"
      >
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        {compact ? "Verified" : "Coach / Pod Verified"}
      </span>
    );
  }
  if (source === "strokelab_ai") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-200"
        title="Measured automatically from your Stroke Lab video analysis"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        Stroke Lab AI
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200"
      title="Logged by the swimmer"
    >
      <User className="h-3.5 w-3.5 shrink-0" />
      Self-logged
    </span>
  );
}

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  if (status === "pending_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Pending Review
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        Needs Practice
      </span>
    );
  }
  return null;
}

export function ProficiencyBadge({ proficiency }: { proficiency: SkillProficiency }) {
  const styles: Record<SkillProficiency, string> = {
    not_started: "bg-slate-100 text-slate-500",
    learning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    confident: "bg-cyan-50 text-cyan-800 ring-1 ring-inset ring-cyan-200",
    mastered: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[proficiency]}`}
    >
      {PROFICIENCY_LABELS[proficiency]}
    </span>
  );
}

export function SafetyGateBadge({ cleared }: { cleared: boolean }) {
  if (cleared) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200"
        title="Safety gate verified by a Coach or Club Readiness assessment"
      >
        <CheckCircle2 className="h-3 w-3 shrink-0" />
        Safety Gate Cleared
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"
      title="Safety gates require Coach or Pod Lead verification — self-logging does not clear a safety gate"
    >
      <ShieldAlert className="h-3 w-3 shrink-0 text-amber-600" />
      Safety Gate
    </span>
  );
}
