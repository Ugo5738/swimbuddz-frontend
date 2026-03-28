"use client";

import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  fetchAvailableQuarters,
  type QuarterlyReportSummary,
} from "@/lib/reports";
import { BarChart3, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

function getCurrentQuarter() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    quarter: Math.ceil((now.getMonth() + 1) / 3),
  };
}

export default function ReportsPage() {
  const [quarters, setQuarters] = useState<QuarterlyReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { year, quarter } = getCurrentQuarter();
  const currentSlug = `q${quarter}-${year}`;

  useEffect(() => {
    fetchAvailableQuarters()
      .then(setQuarters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  // Check if current quarter has a generated report
  const currentQuarterReport = quarters.find(
    (q) => q.year === year && q.quarter === quarter,
  );

  // Past quarters = everything except current
  const pastQuarters = quarters.filter(
    (q) => !(q.year === year && q.quarter === quarter),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Reports</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your quarterly swim reports and shareable cards
        </p>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 text-red-700 text-sm">{error}</Card>
      )}

      {/* Current quarter — always prominent */}
      <Link href={`/account/reports/${currentSlug}`}>
        <Card className="p-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-cyan-100 uppercase tracking-wide">
                Current Quarter
              </p>
              <p className="text-xl font-bold mt-1">
                Q{quarter} {year} Report
              </p>
              <p className="text-sm text-cyan-100 mt-1">
                {currentQuarterReport
                  ? `Generated ${new Date(currentQuarterReport.computed_at!).toLocaleDateString()}`
                  : "View your live stats for this quarter"}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-white/70" />
          </div>
        </Card>
      </Link>

      {/* Past quarters archive */}
      {pastQuarters.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Past Quarters
          </h2>
          <div className="grid gap-3">
            {pastQuarters.map((q) => (
              <Link
                key={`${q.year}-${q.quarter}`}
                href={`/account/reports/q${q.quarter}-${q.year}`}
              >
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-slate-100 p-2">
                        <BarChart3 className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{q.label}</p>
                        <p className="text-xs text-slate-500">
                          {q.computed_at
                            ? `Generated ${new Date(q.computed_at).toLocaleDateString()}`
                            : "Report available"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {quarters.length === 0 && !error && (
        <Card className="p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700">
            No past reports yet
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Your reports will appear here as each quarter completes.
          </p>
        </Card>
      )}
    </div>
  );
}
