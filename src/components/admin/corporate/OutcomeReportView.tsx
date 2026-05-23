"use client";

// Renders a SwimBuddz Wrapped report. Print-friendly: applies a small CSS
// reset via `print:` Tailwind utilities so a single Cmd+P → "Save as PDF"
// produces a clean handout for the HR contact.
//
// Kept as a pure presentation component — fetching, error states, and
// the email-out modal live in the parent page.

import { CheckCircle2, Mail, Printer, Sparkles, Users } from "lucide-react";

import type {
  EmployeeReportRow,
  ProgramOutcomeReport,
} from "@/lib/corporate/api";

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  invited: "Invited",
  registered: "Registered",
  enrolled: "Enrolled",
  opted_out: "Opted out",
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  invited: "bg-sky-100 text-sky-800",
  registered: "bg-amber-100 text-amber-800",
  enrolled: "bg-emerald-100 text-emerald-800",
  opted_out: "bg-rose-100 text-rose-800",
};

function formatPct(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

interface Props {
  report: ProgramOutcomeReport;
  onPrint?: () => void;
  onEmail?: () => void;
}

export function OutcomeReportView({ report, onPrint, onEmail }: Props) {
  return (
    <div className="space-y-6">
      {/* Action bar — hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 text-sky-600" />
          Snapshot generated {formatDate(report.generated_at)}
        </div>
        <div className="flex gap-2">
          {onPrint && (
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print / Save as PDF
            </button>
          )}
          {onEmail && (
            <button
              onClick={onEmail}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
            >
              <Mail className="h-4 w-4" />
              Email to HR contact
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <header className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-xs uppercase tracking-wider text-sky-700">
          SwimBuddz Wrapped
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {report.program_name}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {report.company_name} · Reporting period{" "}
          {formatDate(report.period_from)} – {formatDate(report.period_to)}
        </p>
      </header>

      {/* KPI tiles */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiTile
          label="Employees in cohort"
          value={String(report.employee_count)}
          icon={<Users className="h-5 w-5 text-sky-600" />}
        />
        <KpiTile
          label="Aggregate attendance"
          value={formatPct(report.aggregate_attendance_rate)}
          sub={`${report.aggregate_sessions_attended}/${report.aggregate_sessions_possible} sessions`}
        />
        <KpiTile
          label="Sessions in cohort"
          value={String(report.sessions_in_cohort)}
        />
        <KpiTile
          label="Milestones achieved"
          value={String(report.aggregate_milestones_achieved)}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
      </section>

      {/* Enrollment funnel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Enrollment funnel
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(report.enrollment_funnel).map(([status, count]) => (
            <div
              key={status}
              className="rounded-lg border border-slate-200 p-3"
            >
              <p
                className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                  ENROLLMENT_STATUS_COLORS[status] ||
                  "bg-slate-100 text-slate-700"
                }`}
              >
                {ENROLLMENT_STATUS_LABELS[status] || status}
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-employee breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Per-employee breakdown
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Attendance is computed across sessions that already have a
            recorded outcome (present / late / absent). Excused absences are
            excluded from the denominator.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sessions</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Milestones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.employees.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-slate-500"
                  >
                    No employees on this program yet.
                  </td>
                </tr>
              )}
              {report.employees.map((row) => (
                <EmployeeRow key={row.employee_id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="text-xs text-slate-500 print:mt-12">
        Report ID {report.program_id} · Status {report.status}
      </footer>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function EmployeeRow({ row }: { row: EmployeeReportRow }) {
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-900">{row.full_name}</p>
        <p className="text-xs text-slate-500">{row.email}</p>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
            ENROLLMENT_STATUS_COLORS[row.enrollment_status] ||
            "bg-slate-100 text-slate-700"
          }`}
        >
          {ENROLLMENT_STATUS_LABELS[row.enrollment_status] ||
            row.enrollment_status}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">
        {row.sessions_attended} / {row.sessions_total}
      </td>
      <td className="px-4 py-3 font-medium text-slate-900">
        {formatPct(row.attendance_rate)}
      </td>
      <td className="px-4 py-3 text-slate-700">{row.milestones_achieved}</td>
    </tr>
  );
}
