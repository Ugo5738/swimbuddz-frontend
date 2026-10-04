"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiGet, apiPost } from "@/lib/api";
import { listAllClubPlans } from "@/lib/clubOnboarding";
import type { ClubPlan } from "@/lib/clubOnboarding";
import { adminListPods } from "@/lib/pods";
import type { PodSummary } from "@/lib/pods";

type Enrollment = {
  id: string;
  member_id: string;
  club_id: string;
  club_name: string;
  plan_version_id: string;
  plan_name: string;
  payment_mode: "quarterly_prepaid" | "transition_per_session";
  starts_at: string;
  ends_at: string;
  status: string;
  assigned_pod_id: string | null;
};

type TransferPreview = {
  source_enrollment_id: string;
  member_id: string;
  source_club_id: string;
  source_club_name: string;
  target_club_id: string;
  target_club_name: string;
  target_plan_version_id: string;
  target_plan_name: string;
  target_pod_id: string | null;
  payment_mode: string;
  effective_at: string;
  source_remaining_sessions: number;
  source_remaining_value_kobo: number;
  target_remaining_sessions: number;
  target_remaining_value_kobo: number;
  estimated_difference_kobo: number;
  can_execute_now: boolean;
  requires_financial_reconciliation: boolean;
  guidance: string;
};

type TransferResult = TransferPreview & {
  transfer_id: string;
  target_enrollment_id: string;
};

function money(kobo: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(kobo / 100);
}

function activeNow(enrollment: Enrollment) {
  const now = Date.now();
  return (
    enrollment.status === "active" &&
    new Date(enrollment.starts_at).getTime() <= now &&
    new Date(enrollment.ends_at).getTime() > now
  );
}

export function ClubLocationTransferPanel({ memberId }: { memberId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [plans, setPlans] = useState<ClubPlan[]>([]);
  const [pods, setPods] = useState<PodSummary[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [targetPlanId, setTargetPlanId] = useState("");
  const [targetPodId, setTargetPodId] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<TransferPreview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [memberEnrollments, allPlans] = await Promise.all([
      apiGet<Enrollment[]>(`/api/v1/clubs/admin/members/${memberId}/enrollments`, {
        auth: true,
      }),
      listAllClubPlans(),
    ]);
    setEnrollments(memberEnrollments);
    setPlans(allPlans);
    const current = memberEnrollments.find(activeNow);
    if (current) setSourceId((existing) => existing || current.id);
  }, [memberId]);

  useEffect(() => {
    void load().catch((e: Error) => setError(e.message || "Could not load Club enrollment"));
  }, [load]);

  const source = enrollments.find((item) => item.id === sourceId) ?? null;
  const targetPlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.is_active &&
          !!plan.published_at &&
          (!source || plan.club_id !== source.club_id)
      ),
    [plans, source]
  );
  const targetPlan = targetPlans.find((plan) => plan.id === targetPlanId) ?? null;

  useEffect(() => {
    setPreview(null);
    setTargetPodId("");
    if (!targetPlan) {
      setPods([]);
      return;
    }
    void adminListPods({ clubId: targetPlan.club_id, status: "active" })
      .then(setPods)
      .catch(() => setPods([]));
  }, [targetPlan]);

  const requestBody = {
    target_plan_version_id: targetPlanId,
    ...(targetPodId ? { target_pod_id: targetPodId } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  };

  const doPreview = async () => {
    if (!sourceId || !targetPlanId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPost<TransferPreview>(
        `/api/v1/clubs/admin/enrollments/${sourceId}/location-transfer/preview`,
        requestBody,
        { auth: true }
      );
      setPreview(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not preview Club location transfer");
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!preview?.can_execute_now) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await apiPost<TransferResult>(
        `/api/v1/clubs/admin/enrollments/${sourceId}/location-transfer`,
        requestBody,
        { auth: true }
      );
      setMessage(
        `Home Club changed from ${result.source_club_name} to ${result.target_club_name}.`
      );
      setPreview(null);
      setTargetPlanId("");
      setTargetPodId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not transfer Club location");
    } finally {
      setBusy(false);
    }
  };

  const currentEnrollments = enrollments.filter(activeNow);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Club home location</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        A home-location change is different from visiting another Club for one practice. Transition
        members can move immediately. Prepaid-quarter moves are previewed but require financial
        reconciliation so already-purchased swims are never silently discarded.
      </p>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {message ? <Alert>{message}</Alert> : null}

      {currentEnrollments.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No active location-specific Club enrollment was found for this member.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <Select
            label="Current Club enrollment"
            value={sourceId}
            onChange={(event) => {
              setSourceId(event.target.value);
              setTargetPlanId("");
              setPreview(null);
            }}
          >
            <option value="">Select enrollment</option>
            {currentEnrollments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.club_name} · {item.payment_mode === "transition_per_session" ? "Pay per swim" : "Quarter prepaid"}
              </option>
            ))}
          </Select>

          <Select
            label="Move home Club to"
            value={targetPlanId}
            disabled={!source}
            onChange={(event) => {
              setTargetPlanId(event.target.value);
              setPreview(null);
            }}
          >
            <option value="">Select target Club quarter</option>
            {targetPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.club_name} · {plan.name} · {plan.period_start}–{plan.period_end}
              </option>
            ))}
          </Select>

          {targetPlan ? (
            <Select
              label="Target pod (optional)"
              value={targetPodId}
              onChange={(event) => {
                setTargetPodId(event.target.value);
                setPreview(null);
              }}
            >
              <option value="">No pod yet</option>
              {pods.map((pod) => (
                <option key={pod.id} value={pod.id}>
                  {pod.name} ({pod.active_member_count}/{pod.max_size})
                </option>
              ))}
            </Select>
          ) : null}

          <Input
            label="Admin note (optional)"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              setPreview(null);
            }}
            placeholder="Reason for the permanent location change"
          />

          <Button
            type="button"
            disabled={busy || !sourceId || !targetPlanId}
            onClick={doPreview}
          >
            {busy ? "Checking…" : "Preview location change"}
          </Button>

          {preview ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-semibold text-slate-900">
                {preview.source_club_name} → {preview.target_club_name}
              </p>
              <p className="text-slate-600">{preview.guidance}</p>
              {preview.requires_financial_reconciliation ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>
                      Source remaining: <strong>{preview.source_remaining_sessions} swims</strong>{" "}
                      ({money(preview.source_remaining_value_kobo)})
                    </p>
                    <p>
                      Target remaining: <strong>{preview.target_remaining_sessions} swims</strong>{" "}
                      ({money(preview.target_remaining_value_kobo)})
                    </p>
                  </div>
                  <Alert variant="warning">
                    Estimated value difference: {money(preview.estimated_difference_kobo)}. This
                    preview does not move the prepaid entitlement or issue/collect money.
                  </Alert>
                </>
              ) : (
                <Button type="button" disabled={busy} onClick={execute}>
                  Confirm permanent location change
                </Button>
              )}
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
