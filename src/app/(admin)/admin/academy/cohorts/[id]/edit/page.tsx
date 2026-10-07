"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import type { Cohort } from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { CohortEditForm } from "./_edit/CohortEditForm";

export default function CohortEditPage() {
  const params = useParams();
  const router = useRouter();
  const cohortId = params.id as string;
  const { data: cohort, loading, error, refetch } = useApi<Cohort>(
    cohortId ? `/api/v1/academy/cohorts/${cohortId}` : null,
  );

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-slate-600">Loading cohort settings…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Could not load cohort</h1>
          <p className="mt-1 text-sm text-rose-700">{error}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={refetch}>Try again</Button>
          <Button
            variant="secondary"
            onClick={() => router.push(`/admin/academy/cohorts/${cohortId}`)}
          >
            Back to cohort
          </Button>
        </div>
      </Card>
    );
  }

  if (!cohort) {
    return (
      <Card className="space-y-3">
        <h1 className="text-xl font-semibold text-slate-900">Cohort not found</h1>
        <Button
          variant="secondary"
          onClick={() => router.push("/admin/academy")}
        >
          Back to Academy
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push(`/admin/academy/cohorts/${cohortId}`)}
            className="text-sm font-medium text-cyan-700 hover:text-cyan-900"
          >
            ← Back to cohort
          </button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Edit cohort</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage enrollment rules, dates, location, pricing and payment options for{" "}
            <strong>{cohort.name}</strong>.
          </p>
        </div>
      </header>

      <CohortEditForm
        cohort={cohort}
        onCancel={() => router.push(`/admin/academy/cohorts/${cohortId}`)}
        onSaved={() => router.push(`/admin/academy/cohorts/${cohortId}`)}
      />
    </div>
  );
}
