"use client";
import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type Operation = { id: string; status: string; error: string | null; created_at: string };
export function ExperienceConfigurationRecovery({ offeringId }: { offeringId: string }) {
  const operations = useApi<Operation[]>(
    `/api/v1/clubs/community-experiences/admin/${offeringId}/operations`
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Configuration status and recovery</h2>
        <Button variant="outline" disabled={busy} onClick={operations.refetch}>
          Refresh status
        </Button>
      </div>
      {(error || operations.error) && <Alert variant="error">{error || operations.error}</Alert>}
      <p className="my-2 text-sm">
        If linking Events failed partway through, restore the previous configuration here before
        trying again. Pending recovery blocks new checkout. Recovery does not cancel paid tickets or
        issue refunds.
      </p>
      {operations.data?.map((op) => (
        <div className="mt-2 rounded border p-3 text-sm" key={op.id}>
          <p>
            {new Date(op.created_at).toLocaleString()} · {op.status.replaceAll("_", " ")}
          </p>
          {op.error && <p>{op.error}</p>}
          {["pending", "needs_reconciliation"].includes(op.status) && (
            <Button
              disabled={busy}
              className="mt-2"
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await apiPost(
                    `/api/v1/clubs/community-experiences/admin/${offeringId}/operations/${op.id}/recover`,
                    {},
                    { auth: true }
                  );
                  operations.refetch();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Recovery unavailable; retry when services recover"
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Restore previous configuration
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}
