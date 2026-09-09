"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useApi } from "@/hooks/useApi";

export function RescheduleClubPractice({
  sessionId,
  onChanged,
}: {
  sessionId: string;
  onChanged: () => Promise<void>;
}) {
  const history = useApi<
    Array<{
      id: string;
      reason: string;
      old_start: string;
      new_start: string;
      notification_status: string;
    }>
  >(`/api/v1/sessions/club-operations/${sessionId}/operations`);
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [request, setRequest] = useState<{
    operation_id: string;
    starts_at: string;
    reason: string;
    pool_time_confirmed: boolean;
  } | null>(null);
  const submit = async () => {
    setBusy(true);
    setError("");
    const payload = request ?? {
      operation_id: crypto.randomUUID(),
      starts_at: `${when}:00+01:00`,
      reason,
      pool_time_confirmed: confirmed,
    };
    setRequest(payload);
    try {
      const result = await apiPost<{ notification_status: string }>(
        `/api/v1/sessions/club-operations/${sessionId}/reschedule`,
        payload,
        { auth: true }
      );
      setDone(
        result.notification_status === "sent"
          ? "Rescheduled. Bookings and paid amounts are unchanged."
          : "Rescheduled, but notifications need retry. Use Retry below; it will not move or charge the swim again."
      );
      if (result.notification_status === "sent") setRequest(null);
      await onChanged();
      history.refetch();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reschedule. Retry the same request to check its outcome."
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="mt-3 rounded-lg border p-3">
      <summary className="cursor-pointer font-medium">
        Reschedule swim (rain, makeup or Experience)
      </summary>
      <p className="my-2 text-sm">
        Keeps the same session, duration, pool, bookings and prices. Published coverage must remain
        in its purchased quarter. Confirm pool availability first; review any transport and
        volunteer arrangements separately.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      {done && <Alert>{done}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          New start (Lagos time)
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border p-2"
            value={when}
            disabled={busy || Boolean(request)}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        <label>
          Reason
          <input
            className="mt-1 w-full rounded border p-2"
            value={reason}
            disabled={busy || Boolean(request)}
            onChange={(e) => setReason(e.target.value)}
            maxLength={250}
          />
        </label>
      </div>
      <label className="my-3 block">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={busy || Boolean(request)}
          onChange={(e) => setConfirmed(e.target.checked)}
        />{" "}
        Pool has confirmed the new time
      </label>
      <Button
        type="button"
        disabled={busy || !when || reason.trim().length < 5 || !confirmed}
        onClick={submit}
      >
        {request ? "Retry same reschedule / notifications" : "Confirm reschedule"}
      </Button>
      {request && error && (
        <Button
          className="ml-2"
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => {
            setRequest(null);
            setError("");
          }}
        >
          Edit request after checking schedule
        </Button>
      )}
      {history.error && (
        <Alert variant="error">Could not load reschedule history: {history.error}</Alert>
      )}
      {history.data?.map((op) => (
        <div key={op.id} className="mt-3 border-t pt-2 text-sm">
          <p>
            {op.old_start} → {op.new_start} · {op.reason}
          </p>
          <p>Notifications: {op.notification_status.replaceAll("_", " ")}</p>
          {["pending", "needs_retry"].includes(op.notification_status) && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await apiPost(
                    `/api/v1/sessions/club-operations/${sessionId}/operations/${op.id}/retry-notifications`,
                    {},
                    { auth: true }
                  );
                  history.refetch();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Notification retry failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retry notifications
            </Button>
          )}
        </div>
      ))}
    </details>
  );
}
