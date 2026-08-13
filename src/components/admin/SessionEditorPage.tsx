"use client";

import { SessionFormModal } from "@/components/admin/SessionFormModal";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { useApi } from "@/hooks/useApi";
import { apiPatch, apiPost } from "@/lib/api";
import { createSessionVolunteerOpportunities } from "@/lib/session-volunteers";
import { ArrowLeft, Calculator, Info, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type {
  RideArea,
  Session,
  SessionPayload,
  SessionRideConfig,
} from "@/app/(admin)/admin/sessions/types";
import type { VolunteerNeedDraft } from "@/components/admin/VolunteerNeedsDraftSection";

type Props = {
  sessionId?: string;
  initialStartsAt?: string | null;
};

export function SessionEditorPage({ sessionId, initialStartsAt }: Props) {
  const router = useRouter();
  const savingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const editing = Boolean(sessionId);
  const sessionQuery = useApi<Session>(
    sessionId ? `/api/v1/sessions/${encodeURIComponent(sessionId)}` : null
  );
  const areasQuery = useApi<RideArea[]>("/api/v1/transport/areas");
  const ridesQuery = useApi<SessionRideConfig[]>(
    sessionId
      ? `/api/v1/transport/sessions/${encodeURIComponent(sessionId)}/ride-configs`
      : null
  );

  const goBack = () => router.push("/admin/sessions");

  const saveRideConfigs = async (id: string, rideConfigs: SessionRideConfig[]) => {
    await apiPost(`/api/v1/transport/sessions/${id}/ride-configs`, rideConfigs, { auth: true });
  };

  const createSession = async (
    sessionData: SessionPayload,
    rideConfigs: SessionRideConfig[],
    volunteerNeeds: VolunteerNeedDraft[],
    publishAfter?: boolean
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    let createdSession: Session | null = null;
    try {
      const created = await apiPost<Session>("/api/v1/sessions/", sessionData, { auth: true });
      createdSession = created;
      const volunteerResult = await createSessionVolunteerOpportunities(
        created.id,
        sessionData,
        volunteerNeeds
      );
      if (rideConfigs.length > 0) await saveRideConfigs(created.id, rideConfigs);
      let published = created.status !== "draft";
      if (publishAfter && created.status === "draft") {
        await apiPost(`/api/v1/sessions/${created.id}/publish`, {}, { auth: true });
        published = true;
      }
      const volunteerLabel = volunteerResult.createdCount
        ? ` with ${volunteerResult.createdCount} volunteer opportunit${
            volunteerResult.createdCount === 1 ? "y" : "ies"
          }`
        : "";
      toast.success(
        published
          ? `Session created and published${volunteerLabel}`
          : `Session created as draft${volunteerLabel}`
      );
      goBack();
    } catch (error) {
      if (createdSession) {
        toast.warning(
          "The session was created, but one of its optional extras could not be saved. Reopen the session to finish it."
        );
        goBack();
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to create session");
      }
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  const updateSession = async (
    id: string,
    sessionData: SessionPayload,
    rideConfigs: SessionRideConfig[],
    volunteerNeeds: VolunteerNeedDraft[]
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSubmitting(true);
    let sessionUpdated = false;
    try {
      await apiPatch(`/api/v1/sessions/${id}`, sessionData, { auth: true });
      sessionUpdated = true;
      const volunteerResult = await createSessionVolunteerOpportunities(
        id,
        sessionData,
        volunteerNeeds
      );
      await saveRideConfigs(id, rideConfigs);
      if (volunteerResult.skippedCount > 0) {
        toast.success(
          `Session updated. ${volunteerResult.skippedCount} duplicate volunteer role${
            volunteerResult.skippedCount === 1 ? " was" : "s were"
          } not added again.`
        );
      } else {
        toast.success("Session updated");
      }
      goBack();
    } catch (error) {
      if (sessionUpdated) {
        toast.warning(
          "The main session details were updated, but an optional extra could not be saved. Reopen the session to review it."
        );
        goBack();
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to update session");
      }
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  if (areasQuery.loading || (editing && (sessionQuery.loading || ridesQuery.loading))) {
    return <LoadingCard text={editing ? "Loading session editor…" : "Preparing session form…"} />;
  }

  const loadError = areasQuery.error || sessionQuery.error || ridesQuery.error;
  if (loadError || (editing && !sessionQuery.data)) {
    return (
      <Card className="mx-auto max-w-3xl border-rose-200 bg-rose-50 p-8 text-center">
        <p className="font-medium text-rose-800">{loadError ?? "Session not found"}</p>
        <Link href="/admin/sessions" className="mt-4 inline-flex text-sm font-medium text-cyan-700">
          Return to sessions
        </Link>
      </Card>
    );
  }

  const parsedStart = initialStartsAt ? new Date(initialStartsAt) : null;
  const validInitialDate = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to sessions
        </Link>
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            {editing ? "Edit session" : "Create a session"}
          </h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            {editing
              ? "Update the schedule and manage the ride-share and volunteer opportunities already attached to this session."
              : "Set the schedule first, then add optional pricing detail, volunteer roles, and ride-share routes as needed."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Info className="h-5 w-5 text-cyan-700" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Core details</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Title, audience, pool, time, and capacity.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <Calculator className="h-5 w-5 text-cyan-700" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Pricing</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Use manual for a known price, or cost plus margin for calculated pricing.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <SlidersHorizontal className="h-5 w-5 text-cyan-700" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Optional extras</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Volunteer roles and ride-share routes can be left empty.
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-6 lg:p-8">
        <SessionFormModal
          key={sessionQuery.data?.id ?? "new-session"}
          mode={editing ? "edit" : "create"}
          presentation="page"
          session={sessionQuery.data}
          initialDate={validInitialDate}
          initialRideConfigs={ridesQuery.data ?? []}
          rideAreas={areasQuery.data ?? []}
          submitting={submitting}
          onClose={goBack}
          onCreate={(...args) => void createSession(...args)}
          onUpdate={(...args) => void updateSession(...args)}
        />
      </Card>
    </div>
  );
}
