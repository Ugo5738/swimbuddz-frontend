"use client";

import { EmployeeBulkUpload } from "@/components/admin/corporate/EmployeeBulkUpload";
import { ProgramOrchestrationPanel } from "@/components/admin/corporate/ProgramOrchestrationPanel";
import {
  EmployeeEnrollmentBadge,
  ProgramStatusBadge,
} from "@/components/admin/corporate/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type CorporateContact,
  type CorporateProgram,
  type CorporateProgramEmployee,
  corporateApi,
  nairaFromKobo,
} from "@/lib/corporate/api";
import {
  ArrowLeft,
  BarChart3,
  GraduationCap,
  Plus,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Tab = "overview" | "employees" | "orchestration";

export default function ProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;

  const [program, setProgram] = useState<CorporateProgram | null>(null);
  const [contact, setContact] = useState<CorporateContact | null>(null);
  const [employees, setEmployees] = useState<CorporateProgramEmployee[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = await corporateApi.getProgram(programId);
      setProgram(p);
      const [c, emps] = await Promise.all([
        corporateApi.getContact(p.contact_id),
        corporateApi.listEmployees(programId),
      ]);
      setContact(c);
      setEmployees(emps);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load program";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !program || !contact) {
    return <LoadingCard text="Loading program…" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/corporate/contacts/${contact.id}`}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {contact.company_name}
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            {program.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1 flex items-center gap-2 flex-wrap">
            <ProgramStatusBadge status={program.status} />
            <span>
              {program.employee_count} employees ·{" "}
              {nairaFromKobo(program.total_kobo)}
            </span>
            {program.is_pilot_partner && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                Pilot partner
              </span>
            )}
          </p>
        </div>
        <Link
          href={`/admin/corporate/programs/${programId}/report`}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <BarChart3 className="h-4 w-4" />
          Outcome report
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {(["overview", "employees", "orchestration"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t === "overview"
              ? "Overview"
              : t === "employees"
                ? `Employees (${employees.length})`
                : "Orchestration"}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab program={program} />}
      {tab === "employees" && (
        <EmployeesTab
          program={program}
          employees={employees}
          onOpenBulk={() => setBulkOpen(true)}
          onChange={load}
        />
      )}
      {tab === "orchestration" && (
        <ProgramOrchestrationPanel program={program} onChange={load} />
      )}

      <EmployeeBulkUpload
        programId={programId}
        isOpen={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onAdded={load}
      />
    </div>
  );
}

// ─── Overview ───────────────────────────────────────────────────────────

function OverviewTab({ program }: { program: CorporateProgram }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Pricing
        </h2>
        <Row label="Employees" value={program.employee_count.toString()} />
        <Row
          label="Discount tier"
          value={program.discount_tier.replace(/_/g, " ")}
        />
        <Row
          label="Per employee"
          value={nairaFromKobo(program.per_employee_kobo)}
        />
        <Row label="Total" value={nairaFromKobo(program.total_kobo)} bold />
        <Row
          label="Payment terms"
          value={program.payment_terms.replace(/_/g, " ")}
        />
        <Row
          label="Deposit paid"
          value={nairaFromKobo(program.deposit_paid_kobo)}
        />
        <Row
          label="Balance paid"
          value={nairaFromKobo(program.balance_paid_kobo)}
        />
      </Card>

      <Card className="p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Schedule
        </h2>
        <Row label="Expected start" value={program.expected_start_date} />
        <Row label="Actual start" value={program.actual_start_date} />
        <Row label="Expected end" value={program.expected_end_date} />
        <Row label="Actual end" value={program.actual_end_date} />
      </Card>

      <Card className="p-5 space-y-3 md:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
          Linked resources
        </h2>
        <Row label="Cohort id" value={program.cohort_id ?? "— not linked —"} mono />
        <Row
          label="Wallet id"
          value={program.corporate_wallet_id ?? "— not provisioned —"}
          mono
        />
        {program.notes && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Notes
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {program.notes}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  mono,
}: {
  label: string;
  value: string | null;
  bold?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 w-36 flex-shrink-0">
        {label}
      </div>
      <div
        className={`text-sm text-slate-900 ${bold ? "font-semibold" : ""} ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || <span className="text-slate-400">—</span>}
      </div>
    </div>
  );
}

// ─── Employees ──────────────────────────────────────────────────────────

function EmployeesTab({
  program,
  employees,
  onOpenBulk,
  onChange,
}: {
  program: CorporateProgram;
  employees: CorporateProgramEmployee[];
  onOpenBulk: () => void;
  onChange: () => void;
}) {
  const [matching, setMatching] = useState(false);

  const handleMatch = async () => {
    setMatching(true);
    try {
      const res = await corporateApi.matchMembers(program.id);
      toast.success(
        `Matched ${res.matched} · already matched ${res.already_matched} · unresolved ${res.unresolved}`,
      );
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setMatching(false);
    }
  };

  const handleRemove = async (emp: CorporateProgramEmployee) => {
    if (!confirm(`Remove ${emp.full_name} (${emp.email}) from manifest?`)) return;
    try {
      await corporateApi.removeEmployee(program.id, emp.id);
      toast.success("Removed");
      onChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const unresolved = employees.filter((e) => e.member_id === null).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="text-sm text-slate-600">
          {employees.length} employees ·{" "}
          {unresolved > 0 ? (
            <span className="text-amber-700">
              {unresolved} not matched to SwimBuddz members yet
            </span>
          ) : (
            <span className="text-emerald-700">All matched</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleMatch}
            disabled={matching || employees.length === 0}
          >
            <UserCheck className="w-4 h-4 mr-2" />
            {matching ? "Matching…" : "Match members by email"}
          </Button>
          <Button onClick={onOpenBulk}>
            <Plus className="w-4 h-4 mr-2" />
            Add employees
          </Button>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          No employees yet. Paste in your manifest to start.
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Member</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5 text-slate-900">{e.full_name}</td>
                  <td className="px-4 py-2.5 text-slate-700">{e.email}</td>
                  <td className="px-4 py-2.5">
                    <EmployeeEnrollmentBadge status={e.enrollment_status} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                    {e.member_id ? (
                      <span title={e.member_id}>
                        {e.member_id.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-slate-400">not matched</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRemove(e)}
                      className="text-rose-600 hover:text-rose-800"
                      title="Remove from manifest"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

