"use client";

/**
 * Admin approval queue for cohort extension requests.
 *
 * Coaches request extensions from their cohort page; this is where an
 * admin sees the pending queue and approves/rejects. Approve also
 * extends the cohort end date and propagates the new date to enrolled
 * members' academy access (handled backend-side). Cohort names are
 * resolved client-side from the cohorts list (the backend queue
 * response carries only ids).
 */

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { useApi } from "@/hooks/useApi";
import {
  type Cohort,
  type CohortExtensionRequest,
  ExtensionRequestApi,
} from "@/lib/academy";
import { formatDate } from "@/lib/format";
import { CalendarClock, Check, Clock, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type PendingAction = {
  request: CohortExtensionRequest;
  kind: "approve" | "reject";
};

export default function AdminExtensionRequestsPage() {
  const {
    data: requests,
    loading,
    error,
    refetch,
  } = useApi<CohortExtensionRequest[]>(
    "/api/v1/academy/extension-requests/pending",
  );
  // Resolve cohort_id → name (queue response carries only ids).
  const { data: cohorts } = useApi<Cohort[]>("/api/v1/academy/cohorts");

  const cohortNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cohorts ?? []) map.set(c.id, c.name);
    return map;
  }, [cohorts]);

  const [action, setAction] = useState<PendingAction | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openAction = (
    request: CohortExtensionRequest,
    kind: "approve" | "reject",
  ) => {
    setAction({ request, kind });
    setNotes("");
  };

  const submitAction = async () => {
    if (!action) return;
    setSubmitting(true);
    try {
      if (action.kind === "approve") {
        await ExtensionRequestApi.approve(action.request.id, notes);
        toast.success("Extension approved — cohort end date updated.");
      } else {
        await ExtensionRequestApi.reject(action.request.id, notes);
        toast.success("Extension request rejected.");
      }
      setAction(null);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Action failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pending = requests ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4 md:py-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <CalendarClock className="h-6 w-6 text-cyan-600" />
          Cohort Extension Requests
        </h1>
        <p className="text-sm text-slate-600">
          Coaches request extra weeks for a cohort. Approving updates the
          cohort end date and extends enrolled members&apos; academy access.
        </p>
      </header>

      {loading ? (
        <LoadingPage text="Loading extension requests..." />
      ) : error ? (
        <ErrorState
          title="Couldn't load extension requests"
          description={error}
          onRetry={refetch}
        />
      ) : pending.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No pending requests
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            New coach extension requests will appear here for review.
          </p>
        </Card>
      ) : (
        <>
          <div className="text-sm text-slate-600">
            {pending.length} pending request{pending.length !== 1 ? "s" : ""}
          </div>
          <div className="space-y-4">
            {pending.map((req) => (
              <Card key={req.id} className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {cohortNameById.get(req.cohort_id) ?? "Cohort"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Requested {formatDate(req.created_at)}
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">
                    +{req.weeks_requested} week
                    {req.weeks_requested !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Current end date
                    </p>
                    <p className="text-sm text-slate-900">
                      {formatDate(req.current_end_date)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-cyan-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-cyan-600">
                      Proposed end date
                    </p>
                    <p className="text-sm font-medium text-cyan-900">
                      {formatDate(req.proposed_end_date)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                    {req.reason}
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => openAction(req, "reject")}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Reject
                  </Button>
                  <Button onClick={() => openAction(req, "approve")}>
                    <Check className="mr-1 h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal
        isOpen={action !== null}
        onClose={() => (submitting ? undefined : setAction(null))}
        title={
          action?.kind === "approve"
            ? "Approve extension request"
            : "Reject extension request"
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {action?.kind === "approve"
              ? "This extends the cohort end date and the academy access of every enrolled member. This cannot be undone from here."
              : "The coach will see this request was rejected. Add a note explaining why (optional)."}
          </p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin notes (optional)"
            rows={3}
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={submitAction} disabled={submitting}>
              {submitting
                ? "Working..."
                : action?.kind === "approve"
                  ? "Confirm approval"
                  : "Confirm rejection"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
