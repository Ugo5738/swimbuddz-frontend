"use client";

// HR-portal program detail. Read-only: shows the employee manifest with
// enrollment status + key dates, plus a link to the outcome report.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";

import { PortalNav } from "@/components/corporate/PortalNav";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type PortalEmployeeRow,
  type PortalProgramSummary,
  type PortalSession,
  loadPortalSession,
  portalApi,
} from "@/lib/corporate/portal-api";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  invited: "bg-sky-100 text-sky-800",
  registered: "bg-amber-100 text-amber-800",
  enrolled: "bg-emerald-100 text-emerald-800",
  opted_out: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  invited: "Invited",
  registered: "Registered",
  enrolled: "Enrolled",
  opted_out: "Opted out",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
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

export default function PortalProgramDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programId = params.id;

  const [session, setSession] = useState<PortalSession | null>(null);
  const [program, setProgram] = useState<PortalProgramSummary | null>(null);
  const [employees, setEmployees] = useState<PortalEmployeeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sess = loadPortalSession();
    if (!sess) {
      router.replace("/corporate-portal");
      return;
    }
    setSession(sess);
    let cancelled = false;
    Promise.all([
      portalApi.getProgram(programId),
      portalApi.listEmployees(programId),
    ])
      .then(([p, emps]) => {
        if (cancelled) return;
        setProgram(p);
        setEmployees(emps);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to load program";
        setError(msg);
      });
    return () => {
      cancelled = true;
    };
  }, [programId, router]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <PortalNav session={session} />

      <Link
        href="/corporate-portal/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> All programs
      </Link>

      {!program && !error && <LoadingCard text="Loading program…" />}
      {error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-900">
          <p className="font-medium">Couldn&apos;t load the program</p>
          <p className="mt-1 text-sm">{error}</p>
        </Card>
      )}

      {program && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {program.name}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                {program.employee_count} employees · Starts{" "}
                {formatDate(
                  program.actual_start_date || program.expected_start_date,
                )}
              </p>
            </div>
            <Link
              href={`/corporate-portal/programs/${programId}/report`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <BarChart3 className="h-4 w-4" /> View outcome report
            </Link>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white">
            <header className="border-b border-slate-200 p-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Employee roster
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Read-only view. To add or remove employees, contact your
                SwimBuddz account manager.
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Invited</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!employees && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center">
                        Loading…
                      </td>
                    </tr>
                  )}
                  {employees && employees.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No employees on the manifest yet.
                      </td>
                    </tr>
                  )}
                  {employees &&
                    employees.map((e) => (
                      <tr key={e.id}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {e.full_name}
                          </p>
                          <p className="text-xs text-slate-500">{e.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                              STATUS_BADGE[e.enrollment_status] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {STATUS_LABEL[e.enrollment_status] ||
                              e.enrollment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(e.invitation_sent_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(e.registered_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDate(e.enrolled_at)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
