"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";

import {
  CLUB_ADVISORY_SIGNAL_LABELS,
  type ClubAdvisorySignal,
  type ClubReadinessAdvisory,
  CompetencyPassportApi,
  SOURCE_TYPE_LABELS,
} from "@/lib/academy/competency-passport";

interface Props {
  memberAuthId: string | null | undefined;
}

const SIGNAL_STYLES: Record<ClubAdvisorySignal, string> = {
  meets_club_safety_profile: "border-emerald-200 bg-emerald-50 text-emerald-900",
  partial_evidence: "border-cyan-200 bg-cyan-50 text-cyan-900",
  renewal_or_recheck_needed: "border-amber-200 bg-amber-50 text-amber-900",
  no_v2_evidence: "border-slate-200 bg-slate-50 text-slate-700",
};

const CHECK_BADGE: Record<string, string> = {
  verified: "bg-emerald-100 text-emerald-900",
  expired: "bg-amber-100 text-amber-900",
  recheck_required: "bg-amber-100 text-amber-900",
  revoked: "bg-rose-100 text-rose-900",
  not_verified: "bg-slate-100 text-slate-600",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ClubReadinessCompetencyAdvisory({ memberAuthId }: Props) {
  const [advisory, setAdvisory] = useState<ClubReadinessAdvisory | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!memberAuthId) {
      setAdvisory(null);
      setUnavailable(false);
      return;
    }
    let active = true;
    setLoading(true);
    setUnavailable(false);
    CompetencyPassportApi.adminClubReadinessAdvisory(memberAuthId)
      .then((data) => {
        if (active) setAdvisory(data);
      })
      .catch(() => {
        if (active) {
          setAdvisory(null);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [memberAuthId]);

  if (!memberAuthId) return null;

  return (
    <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {advisory?.advisory_signal === "meets_club_safety_profile" ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-cyan-700" />
          )}
          <h3 className="font-semibold text-slate-900">
            Academy V2 Competency Passport (Advisory)
          </h3>
        </div>
        <Link
          href="/admin/academy/competencies"
          className="text-xs font-medium text-cyan-700 hover:underline"
        >
          Open Competency Console →
        </Link>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">
          Checking verified Academy V2 safety credentials...
        </p>
      ) : unavailable ? (
        <p className="text-xs text-slate-500">
          Academy competency advisory is temporarily unavailable. Continue normal
          Club review using the member&apos;s assessment evidence below.
        </p>
      ) : !advisory ? null : (
        <>
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              SIGNAL_STYLES[advisory.advisory_signal]
            }`}
          >
            <p>{CLUB_ADVISORY_SIGNAL_LABELS[advisory.advisory_signal]}</p>
            <p className="mt-0.5 font-normal opacity-90">
              {advisory.counts.verified_safety_gates} active safety gates ·{" "}
              {advisory.counts.verified_total} total verified credentials
              {advisory.counts.expired_or_recheck > 0
                ? ` · ${advisory.counts.expired_or_recheck} expired/recheck`
                : ""}
              {advisory.counts.revoked > 0
                ? ` · ${advisory.counts.revoked} revoked`
                : ""}
            </p>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2">
            {advisory.core_club_checks.map((check) => (
              <li
                key={check.check_key}
                className="space-y-1 rounded-lg border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">{check.label}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      CHECK_BADGE[check.status] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {check.status.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  <code>{check.milestone_code}</code>
                  {check.required_for_club_profile ? " · Core Club gate" : " · Foundation"}
                </p>
                {check.verified_at && (
                  <p className="text-[11px] text-slate-600">
                    {check.source_type ? SOURCE_TYPE_LABELS[check.source_type] : "Verified"}{" "}
                    on {formatDate(check.verified_at)}
                    {check.expires_at ? ` · Exp ${formatDate(check.expires_at)}` : ""}
                  </p>
                )}
                {check.status_reason && (
                  <p className="text-[11px] text-amber-800">{check.status_reason}</p>
                )}
              </li>
            ))}
          </ul>

          {advisory.non_verified_alerts.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-950">
              <p className="font-semibold">Expired, revoked, or recheck alerts</p>
              <ul className="space-y-1">
                {advisory.non_verified_alerts.map((alert) => (
                  <li key={alert.verification_id}>
                    <code>{alert.code ?? "V2"}</code> ({alert.title}):{" "}
                    <strong>{alert.status.replaceAll("_", " ")}</strong>
                    {alert.status_reason ? ` — ${alert.status_reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-slate-500">{advisory.advisory_note}</p>
        </>
      )}
    </div>
  );
}
