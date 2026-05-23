"use client";

// Portal-facing version of the SwimBuddz Wrapped report. Reuses the
// admin's OutcomeReportView component — same data shape, same render —
// but fetches via the portal API client so it's scoped to the caller's
// company. No email-out action for the portal user; they print/PDF.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { OutcomeReportView } from "@/components/admin/corporate/OutcomeReportView";
import { PortalNav } from "@/components/corporate/PortalNav";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type PortalSession,
  type ProgramOutcomeReport,
  loadPortalSession,
  portalApi,
} from "@/lib/corporate/portal-api";

export default function PortalReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const programId = params.id;

  const [session, setSession] = useState<PortalSession | null>(null);
  const [report, setReport] = useState<ProgramOutcomeReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sess = loadPortalSession();
    if (!sess) {
      router.replace("/corporate-portal");
      return;
    }
    setSession(sess);
    let cancelled = false;
    portalApi
      .getReport(programId)
      .then((r) => {
        if (!cancelled) setReport(r);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load report",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [programId, router]);

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PortalNav session={session} />
        <Link
          href={`/corporate-portal/programs/${programId}`}
          className="mt-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to program
        </Link>
      </div>

      {!report && !error && <LoadingCard text="Building outcome report…" />}

      {error && (
        <ErrorState
          title="Could not load the report"
          description={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {report && (
        <OutcomeReportView
          report={report}
          onPrint={() => window.print()}
        />
      )}
    </div>
  );
}
