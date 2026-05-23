"use client";

// Admin-side outcome report page for a corporate program.
//
// Fetches /api/v1/admin/corporate/programs/{id}/report — backend builds
// the aggregation from attendance + academy summary in real time, so this
// page is a thin renderer. Sister actions: print (CSS via OutcomeReportView)
// and email-to-HR (modal → POST /report/email).

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EmailReportDialog } from "@/components/admin/corporate/EmailReportDialog";
import { OutcomeReportView } from "@/components/admin/corporate/OutcomeReportView";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type ProgramOutcomeReport,
  corporateApi,
} from "@/lib/corporate/api";

export default function ProgramReportPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;

  const [report, setReport] = useState<ProgramOutcomeReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const r = await corporateApi.getProgramReport(programId);
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load report",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [programId]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href={`/admin/corporate/programs/${programId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to program
        </Link>
      </div>

      {loading && <LoadingCard text="Building outcome report…" />}

      {error && !loading && (
        <ErrorState
          title="Could not load the report"
          description={error}
          onRetry={() => window.location.reload()}
        />
      )}

      {report && !loading && (
        <>
          <OutcomeReportView
            report={report}
            onPrint={() => window.print()}
            onEmail={() => setEmailOpen(true)}
          />
          <EmailReportDialog
            programId={programId}
            reportUrl={pageUrl}
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
          />
        </>
      )}
    </div>
  );
}
