"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type CohortGraduationParity,
  CompetencyPassportApi,
  PARITY_STATUS_LABELS,
  type ParityStatus,
} from "@/lib/academy/competency-passport";

interface Props {
  cohortId: string;
  refreshKey: number;
  onJumpToPromote: (memberAuthId: string) => void;
}

const BADGE_CLASS: Record<ParityStatus, string> = {
  aligned_eligible: "bg-emerald-100 text-emerald-900",
  aligned_ineligible: "bg-slate-100 text-slate-700",
  legacy_only_eligible: "bg-amber-100 text-amber-900",
  v2_only_eligible: "bg-cyan-100 text-cyan-900",
  no_frozen_snapshot: "bg-slate-100 text-slate-600",
  snapshot_integrity_error: "bg-rose-100 text-rose-900",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function GraduationParityPanel({
  cohortId,
  refreshKey,
  onJumpToPromote,
}: Props) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const [report, setReport] = useState<CohortGraduationParity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!cohortId) {
      setReport(null);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    CompetencyPassportApi.adminCohortGraduationParity(cohortId, includeInactive)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((err) => {
        if (active) {
          setReport(null);
          setError(
            err instanceof Error
              ? err.message
              : "Could not load dual-read graduation parity.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cohortId, includeInactive, refreshKey]);

  if (!cohortId) {
    return (
      <Card className="p-6 text-sm text-slate-600">
        Select a specific cohort in the filter bar above to compare legacy graduation
        eligibility against V2 frozen-snapshot competency credentials.
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 text-sm text-cyan-950">
        <div className="space-y-1">
          <p className="font-semibold">
            Read-only dual-read shadow comparison (Phase 5A)
          </p>
          <p className="text-xs text-cyan-900">
            Legacy graduation and certificate issuance remain authoritative until
            parity holds and an explicit Phase 5B cutover is authorized. Loading this
            report never modifies enrollments, certificates, or rewards.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-cyan-950">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Include dropped / pending enrollments
        </label>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-sm text-slate-600">
          Computing batched dual-read graduation parity...
        </Card>
      ) : !report ? null : (
        <>
          {!report.has_frozen_snapshot ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                <strong>{report.cohort_name}</strong> does not have a frozen V2
                requirements snapshot yet. V2 eligibility fails closed until requirements
                are frozen.
              </p>
              <Link
                href="/admin/academy/requirements"
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
              >
                Freeze Requirements →
              </Link>
            </div>
          ) : !report.snapshot_integrity_valid ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              Frozen snapshot integrity check failed for{" "}
              <strong>{report.cohort_name}</strong>. V2 eligibility fails closed until
              remediated.
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-medium text-slate-500">Dual-Read Parity</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {report.summary.parity_rate_percent !== null
                  ? `${report.summary.parity_rate_percent}%`
                  : "Not ready"}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {report.summary.aligned_count} / {report.summary.total_enrollments}{" "}
                learners aligned
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-slate-500">Aligned Learners</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {report.summary.aligned_eligible_count}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Eligible in both · {report.summary.aligned_ineligible_count} still in
                progress
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-slate-500">
                Legacy-Only Eligible (Review)
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  report.summary.legacy_only_eligible_count > 0
                    ? "text-amber-700"
                    : "text-emerald-700"
                }`}
              >
                {report.summary.legacy_only_eligible_count}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {report.summary.zero_legacy_regression
                  ? "Zero legacy regressions"
                  : "Needs V2 promotion or safety renewal"}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium text-slate-500">
                V2-Only Eligible (Native / Credit)
              </p>
              <p className="mt-1 text-2xl font-bold text-cyan-700">
                {report.summary.v2_only_eligible_count}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {report.v2_required_milestones_count} V2 required (
                {report.v2_safety_gate_count} safety gates) vs.{" "}
                {report.legacy_total_milestones} legacy
              </p>
            </Card>
          </div>

          {report.enrollments.length === 0 ? (
            <Card className="p-6 text-sm text-slate-600">
              No matching enrollments found in this cohort.
            </Card>
          ) : (
            <ul className="space-y-3">
              {report.enrollments.map((row) => (
                <li
                  key={row.enrollment_id}
                  className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {row.member_name || "Learner"}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            BADGE_CLASS[row.parity_status]
                          }`}
                        >
                          {PARITY_STATUS_LABELS[row.parity_status]}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          {row.enrollment_status}
                        </span>
                        {row.certificate_issued && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                            Cert {row.certificate_code} ·{" "}
                            {formatDate(row.certificate_issued_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Auth: <code>{row.member_auth_id ?? "missing"}</code>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {row.parity_status === "legacy_only_eligible" &&
                        row.member_auth_id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onJumpToPromote(row.member_auth_id!)}
                          >
                            Review in Promotion Queue →
                          </Button>
                        )}
                      <Link
                        href={`/admin/academy/enrollments/${row.enrollment_id}`}
                        className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Enrollment
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-xs md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        Legacy rule:{" "}
                        <span
                          className={
                            row.legacy_eligible
                              ? "text-emerald-700"
                              : "text-slate-600"
                          }
                        >
                          {row.legacy_achieved_count} / {row.legacy_total_milestones}{" "}
                          milestones ({row.legacy_eligible ? "Eligible" : "In progress"})
                        </span>
                      </p>
                      {row.legacy_missing_milestones.length > 0 && (
                        <p className="text-slate-600">
                          Missing: {row.legacy_missing_milestones.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-800">
                        V2 competency rule:{" "}
                        <span
                          className={
                            row.v2_eligible ? "text-emerald-700" : "text-slate-600"
                          }
                        >
                          {row.v2_verified_required_count} / {row.v2_required_total}{" "}
                          required ({row.v2_eligible ? "Eligible" : "Not eligible"})
                        </span>
                      </p>
                      {row.v2_prior_credit_codes.length > 0 && (
                        <p className="text-cyan-800">
                          Prior credit recognized:{" "}
                          {row.v2_prior_credit_codes.join(", ")}
                        </p>
                      )}
                      {row.v2_missing_safety_gate_codes.length > 0 && (
                        <p className="font-medium text-rose-700">
                          Missing safety gates:{" "}
                          {row.v2_missing_safety_gate_codes.join(", ")}
                        </p>
                      )}
                      {row.v2_missing_required_codes.length > 0 && (
                        <p className="text-slate-600">
                          Missing V2 codes: {row.v2_missing_required_codes.join(", ")}
                        </p>
                      )}
                      {row.v2_blocked_details.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {row.v2_blocked_details.map((detail) => (
                            <span
                              key={`${detail.code}-${detail.status}`}
                              className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900"
                            >
                              <code>{detail.code}</code>: {detail.status}
                              {detail.reason ? ` (${detail.reason})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
