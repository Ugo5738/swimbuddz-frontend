"use client";

import type {
  DealStage,
  EmployeeEnrollmentStatus,
  ProgramStatus,
} from "@/lib/corporate/api";

type BadgeConfig = { label: string; className: string };

const DEAL_STAGE_CONFIG: Record<DealStage, BadgeConfig> = {
  lead: { label: "Lead", className: "bg-slate-100 text-slate-700" },
  contacted: { label: "Contacted", className: "bg-sky-100 text-sky-700" },
  intro_scheduled: {
    label: "Intro scheduled",
    className: "bg-indigo-100 text-indigo-700",
  },
  intro_done: { label: "Intro done", className: "bg-violet-100 text-violet-700" },
  proposal_sent: {
    label: "Proposal sent",
    className: "bg-amber-100 text-amber-700",
  },
  negotiating: { label: "Negotiating", className: "bg-orange-100 text-orange-700" },
  won: { label: "Won", className: "bg-emerald-100 text-emerald-700" },
  lost: { label: "Lost", className: "bg-rose-100 text-rose-700" },
};

const PROGRAM_STATUS_CONFIG: Record<ProgramStatus, BadgeConfig> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  ready: { label: "Ready", className: "bg-cyan-100 text-cyan-700" },
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", className: "bg-blue-100 text-blue-700" },
  cancelled: { label: "Cancelled", className: "bg-rose-100 text-rose-700" },
};

const EMPLOYEE_STATUS_CONFIG: Record<EmployeeEnrollmentStatus, BadgeConfig> = {
  pending: { label: "Pending", className: "bg-slate-100 text-slate-700" },
  invited: { label: "Invited", className: "bg-sky-100 text-sky-700" },
  registered: { label: "Registered", className: "bg-amber-100 text-amber-700" },
  enrolled: { label: "Enrolled", className: "bg-emerald-100 text-emerald-700" },
  opted_out: { label: "Opted out", className: "bg-rose-100 text-rose-700" },
};

function pill(cfg: BadgeConfig) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

export function DealStageBadge({ stage }: { stage: DealStage }) {
  return pill(
    DEAL_STAGE_CONFIG[stage] ?? {
      label: stage,
      className: "bg-slate-100 text-slate-700",
    },
  );
}

export function ProgramStatusBadge({ status }: { status: ProgramStatus }) {
  return pill(
    PROGRAM_STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-slate-100 text-slate-700",
    },
  );
}

export function EmployeeEnrollmentBadge({
  status,
}: {
  status: EmployeeEnrollmentStatus;
}) {
  return pill(
    EMPLOYEE_STATUS_CONFIG[status] ?? {
      label: status,
      className: "bg-slate-100 text-slate-700",
    },
  );
}

// Useful exports for forms / dropdowns
export const DEAL_STAGES: DealStage[] = [
  "lead",
  "contacted",
  "intro_scheduled",
  "intro_done",
  "proposal_sent",
  "negotiating",
  "won",
  "lost",
];

export const PROGRAM_STATUSES: ProgramStatus[] = [
  "draft",
  "ready",
  "active",
  "completed",
  "cancelled",
];

export function dealStageLabel(stage: DealStage): string {
  return DEAL_STAGE_CONFIG[stage]?.label ?? stage;
}

export function programStatusLabel(status: ProgramStatus): string {
  return PROGRAM_STATUS_CONFIG[status]?.label ?? status;
}

export function employeeStatusLabel(status: EmployeeEnrollmentStatus): string {
  return EMPLOYEE_STATUS_CONFIG[status]?.label ?? status;
}
