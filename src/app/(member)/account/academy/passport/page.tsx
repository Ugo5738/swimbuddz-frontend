"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import {
  CompetencyPassportApi,
  type CompetencyPassport,
  type CompetencyStatus,
} from "@/lib/academy/competency-passport";

const statusDescription: Record<CompetencyStatus, string> = {
  verified: "Verified",
  expired: "Needs renewal",
  recheck_required: "Needs reassessment",
  revoked: "Verification withdrawn",
};

const statusAppearance: Record<CompetencyStatus, string> = {
  verified: "bg-emerald-100 text-emerald-900",
  expired: "bg-amber-100 text-amber-900",
  recheck_required: "bg-amber-100 text-amber-900",
  revoked: "bg-rose-100 text-rose-900",
};

function friendlyDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AcademyCompetencyPassportPage() {
  const [passport, setPassport] = useState<CompetencyPassport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    CompetencyPassportApi.me()
      .then((data) => {
        if (active) setPassport(data);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error ? reason.message : "Could not load competencies.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const verified = useMemo(
    () => passport?.competencies.filter((item) => item.status === "verified") ?? [],
    [passport],
  );
  const other = useMemo(
    () => passport?.competencies.filter((item) => item.status !== "verified") ?? [],
    [passport],
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 py-4">
      <header className="space-y-2">
        <Link href="/account/academy" className="text-sm text-cyan-700 hover:underline">
          Back to My Academy
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
          My Swimming Competencies
        </h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Your independently verified swimming abilities, with their assessment
          history. Class attendance and submitted videos alone do not count as
          verified competencies.
        </p>
      </header>

      {loading ? (
        <div role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading your swimming competencies...
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error}
        </div>
      ) : (
        <>
          <Card className="space-y-1 p-5">
            <p className="text-sm text-slate-500">Currently verified</p>
            <p className="text-3xl font-bold text-slate-900">{verified.length}</p>
            <p className="text-xs text-slate-500">
              Verified learning may be considered in another Academy pathway.
              Club admission and graduation still have their own assessment rules.
            </p>
          </Card>

          {passport?.competencies.length === 0 ? (
            <Card className="p-6">
              <h2 className="font-semibold text-slate-900">No portable verifications yet</h2>
              <p className="mt-2 text-sm text-slate-600">
                Your Academy progress is still available in My Academy. This
                passport only includes competencies independently reviewed
                against the newer evidence standard; older achievements are not
                automatically copied into it.
              </p>
              <Link href="/account/academy" className="mt-4 inline-block text-sm font-semibold text-cyan-700 hover:underline">
                View Academy progress
              </Link>
            </Card>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Verified competencies
                </h2>
                {verified.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No current competency verifications.
                  </p>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2">
                    {verified.map((item) => (
                      <li key={item.milestone_definition_id}>
                        <Card className="h-full space-y-2 p-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusAppearance[item.status]}`}>
                            {statusDescription[item.status]}
                          </span>
                          <h3 className="text-base font-semibold text-slate-900">
                            {item.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {item.code ?? "Swimming competency"} · {item.supporting_verification_ids.length} valid assessment(s)
                          </p>
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {other.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Competencies requiring follow-up
                  </h2>
                  <ul className="space-y-2">
                    {other.map((item) => (
                      <li key={item.milestone_definition_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4">
                        <span className="font-medium text-slate-900">{item.title}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusAppearance[item.status]}`}>
                          {statusDescription[item.status]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Assessment history
                </h2>
                <p className="text-sm text-slate-600">
                  Historical assessments remain visible even if a verification
                  expires or is withdrawn.
                </p>
                <ul className="space-y-2">
                  {passport?.verifications.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{item.title}</p>
                          <p className="text-xs text-slate-500">
                            Verified {friendlyDate(item.verified_at)}
                            {item.expires_at && ` · Review by ${friendlyDate(item.expires_at)}`}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusAppearance[item.status]}`}>
                          {statusDescription[item.status]}
                        </span>
                      </div>
                      {item.status_reason && (
                        <p className="mt-3 text-xs text-slate-600">{item.status_reason}</p>
                      )}
                      <details className="mt-3 text-sm">
                        <summary className="cursor-pointer font-medium text-cyan-700">
                          Assessment criteria
                        </summary>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700">
                          {item.criteria_passed.map((criterion) => (
                            <li key={criterion}>{criterion}</li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
