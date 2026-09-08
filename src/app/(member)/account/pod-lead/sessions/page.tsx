"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { listPodsILead, PodSummary } from "@/lib/pods";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RescheduleClubPractice } from "@/components/club/RescheduleClubPractice";

type Practice = {
  id: string;
  title: string;
  starts_at: string;
  status: string;
  club_access_mode: string;
};
export default function PodPracticePage() {
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [pod, setPod] = useState("");
  const [sessions, setSessions] = useState<Practice[]>([]);
  const [when, setWhen] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState<{
    operation_id: string;
    pod_id: string;
    starts_at: string;
    pool_time_confirmed: boolean;
  } | null>(null);
  useEffect(() => {
    listPodsILead()
      .then(setPods)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load your pods"));
  }, []);
  const load = async (id: string) => {
    setSessions(
      await apiGet<Practice[]>(`/api/v1/sessions/club-operations/pods/${id}`, { auth: true })
    );
  };
  return (
    <div className="mx-auto max-w-4xl space-y-5 py-8">
      <h1 className="text-2xl font-bold">Pod practice scheduling</h1>
      <p>
        Create extra practices or move your pod’s upcoming swim after confirming pool availability.
        Extra practices do not increase the purchased quarter’s price or promised count. Active
        prepaid Club access includes them; transition members pay the current Session price.
      </p>
      {error && <Alert variant="error">{error}</Alert>}
      <label className="block">
        Your active pod
        <select
          className="mt-1 w-full rounded border p-2"
          value={pod}
          disabled={busy || Boolean(request)}
          onChange={async (e) => {
            const id = e.target.value;
            setPod(id);
            setSessions([]);
            setError("");
            if (id) {
              setBusy(true);
              try {
                await load(id);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not load practices");
              } finally {
                setBusy(false);
              }
            }
          }}
        >
          <option value="">Choose pod</option>
          {pods
            .filter((p) => p.status === "active")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      {pod && (
        <Card>
          <h2 className="font-semibold">Extra practice</h2>
          <p className="my-2 text-sm">
            The server uses your pod’s configured pool, capacity and Admin-approved template
            duration and cost settings. Leads cannot override the price or move another pod’s
            practice.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              const payload = request ?? {
                operation_id: crypto.randomUUID(),
                pod_id: pod,
                starts_at: `${when}:00+01:00`,
                pool_time_confirmed: confirmed,
              };
              setRequest(payload);
              try {
                await apiPost("/api/v1/sessions/club-operations/extra-practices", payload, {
                  auth: true,
                });
                setRequest(null);
                setWhen("");
                setConfirmed(false);
                await load(pod);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not create practice; retry the same request to check its outcome"
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Start (Lagos time)
              <input
                required
                disabled={busy || Boolean(request)}
                type="datetime-local"
                className="mt-1 w-full rounded border p-2"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
            </label>
            <label className="my-3 block">
              <input
                required
                type="checkbox"
                disabled={busy || Boolean(request)}
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />{" "}
              Pool has confirmed this time
            </label>
            <Button disabled={busy || !confirmed} type="submit">
              {request ? "Retry same practice request" : "Create extra practice"}
            </Button>
            {request && error && (
              <Button
                type="button"
                className="ml-2"
                variant="outline"
                disabled={busy}
                onClick={() => setRequest(null)}
              >
                Edit after checking schedule
              </Button>
            )}
          </form>
        </Card>
      )}
      {sessions.map((s) => (
        <Card key={s.id}>
          <h2 className="font-semibold">{s.title}</h2>
          <p>
            {new Date(s.starts_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} ·{" "}
            {s.club_access_mode.replaceAll("_", " ")} · {s.status}
          </p>
          {["scheduled", "draft"].includes(s.status) && (
            <RescheduleClubPractice sessionId={s.id} onChanged={() => load(pod)} />
          )}
        </Card>
      ))}
    </div>
  );
}
