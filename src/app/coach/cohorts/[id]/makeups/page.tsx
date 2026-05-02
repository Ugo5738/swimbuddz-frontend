"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
  type CoachSession,
  type Cohort,
  type Enrollment,
  getCohort,
  getCohortStudents,
  getMyCoachSessions,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import {
  type MakeupObligation,
  type MakeupReason,
  type MakeupStatus,
  coachListMyMakeups,
  coachScheduleMakeup,
} from "@/lib/payouts";
import { ArrowLeft, CalendarPlus, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const REASON_LABEL: Record<MakeupReason, string> = {
  late_join: "Late join",
  excused_absence: "Excused absence",
  session_cancelled: "Session cancelled",
};

const STATUS_VARIANT: Record<
  MakeupStatus,
  "warning" | "info" | "success" | "default" | "danger"
> = {
  pending: "warning",
  scheduled: "info",
  completed: "success",
  expired: "default",
  cancelled: "danger",
};

export default function CoachCohortMakeupsPage() {
  const params = useParams();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [futureSessions, setFutureSessions] = useState<CoachSession[]>([]);
  const [obligations, setObligations] = useState<MakeupObligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row local state for the scheduling form: { [obligationId]: { sessionId, notes } }
  const [draft, setDraft] = useState<
    Record<string, { sessionId: string; notes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [cohortData, studentsData, allSessions, makeupResp] =
        await Promise.all([
          getCohort(cohortId),
          getCohortStudents(cohortId),
          getMyCoachSessions(),
          coachListMyMakeups({ cohort_id: cohortId, page_size: 200 }),
        ]);
      setCohort(cohortData);
      setStudents(studentsData);
      const nowIso = new Date().toISOString();
      setFutureSessions(
        allSessions
          .filter((s) => s.cohort_id === cohortId && s.starts_at > nowIso)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      );
      setObligations(makeupResp.items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cohortId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cohortId]);

  const studentNameById = useMemo(() => {
    const m = new Map<string, { name: string; email: string }>();
    for (const s of students) {
      m.set(s.member_id, {
        name: s.member_name ?? s.member_email ?? s.member_id.slice(0, 8),
        email: s.member_email ?? "",
      });
    }
    return m;
  }, [students]);

  const sessionLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of futureSessions) {
      m.set(
        s.id,
        `${formatDate(s.starts_at)} — ${s.title || s.lesson_title || "Session"}`,
      );
    }
    return m;
  }, [futureSessions]);

  // Group obligations by status for clearer UX
  const grouped = useMemo(() => {
    return {
      pending: obligations.filter((o) => o.status === "pending"),
      scheduled: obligations.filter((o) => o.status === "scheduled"),
      completed: obligations.filter((o) => o.status === "completed"),
      other: obligations.filter(
        (o) => o.status === "expired" || o.status === "cancelled",
      ),
    };
  }, [obligations]);

  function setDraftFor(
    obligationId: string,
    patch: Partial<{ sessionId: string; notes: string }>,
  ) {
    setDraft((prev) => ({
      ...prev,
      [obligationId]: {
        sessionId: prev[obligationId]?.sessionId ?? "",
        notes: prev[obligationId]?.notes ?? "",
        ...patch,
      },
    }));
  }

  async function handleSchedule(o: MakeupObligation) {
    const d = draft[o.id];
    if (!d?.sessionId) {
      toast.error("Pick a session first");
      return;
    }
    setSavingId(o.id);
    try {
      await coachScheduleMakeup(o.id, d.sessionId, d.notes || undefined);
      toast.success("Make-up scheduled");
      await loadAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Schedule failed";
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <LoadingCard />;
  if (error) return <Alert variant="error">{error}</Alert>;
  if (!cohort) return <Alert variant="error">Cohort not found</Alert>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/coach/cohorts/${cohortId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cohort
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">
          Make-up Sessions
        </h1>
        <p className="text-sm text-slate-600">{cohort.name}</p>
      </div>

      <Alert variant="info">
        Make-ups are auto-created when a student joins late, when you mark
        them <em>Excused</em> for a session, or when a session is cancelled.
        Schedule each one to a future session in this cohort. Once you mark
        the student PRESENT or LATE on the linked session, the obligation
        flips to <strong>Completed</strong> and the corresponding ₦ amount is
        included in your next block payout.
      </Alert>

      {/* Pending — needs scheduling */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Pending ({grouped.pending.length})
        </h2>
        {grouped.pending.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nothing to schedule. Make-ups appear here when students miss
            sessions.
          </p>
        ) : futureSessions.length === 0 ? (
          <Alert variant="error">
            No future sessions in this cohort to schedule make-ups against.
            Ask an admin to create extra sessions, then return here.
          </Alert>
        ) : (
          <div className="space-y-3">
            {grouped.pending.map((o) => {
              const student = studentNameById.get(o.student_member_id);
              const d = draft[o.id] ?? { sessionId: "", notes: "" };
              return (
                <div
                  key={o.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 rounded-lg bg-slate-50"
                >
                  <div className="md:col-span-3">
                    <p className="font-medium text-slate-900">
                      {student?.name ?? o.student_member_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-500">{student?.email}</p>
                    <Badge variant={STATUS_VARIANT[o.status]} className="mt-1">
                      {REASON_LABEL[o.reason]}
                    </Badge>
                  </div>
                  <div className="md:col-span-4">
                    <Select
                      value={d.sessionId}
                      onChange={(e) =>
                        setDraftFor(o.id, { sessionId: e.target.value })
                      }
                    >
                      <option value="">— Pick a session —</option>
                      {futureSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatDate(s.starts_at)}
                          {" — "}
                          {s.title || s.lesson_title || "Session"}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-3">
                    <Input
                      placeholder="Notes (optional)"
                      value={d.notes}
                      onChange={(e) =>
                        setDraftFor(o.id, { notes: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2 flex md:justify-end">
                    <Button
                      onClick={() => handleSchedule(o)}
                      disabled={savingId === o.id || !d.sessionId}
                      size="sm"
                    >
                      <CalendarPlus className="h-4 w-4 mr-1" />
                      {savingId === o.id ? "Saving…" : "Schedule"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Scheduled — already assigned to a session */}
      {grouped.scheduled.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Scheduled ({grouped.scheduled.length})
          </h2>
          <div className="space-y-2">
            {grouped.scheduled.map((o) => {
              const student = studentNameById.get(o.student_member_id);
              const sessionLabel = o.scheduled_session_id
                ? sessionLabelById.get(o.scheduled_session_id) ??
                  o.scheduled_session_id.slice(0, 8)
                : "(unscheduled)";
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-blue-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {student?.name ?? o.student_member_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-600 inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sessionLabel}
                    </p>
                  </div>
                  <Badge variant="info">{REASON_LABEL[o.reason]}</Badge>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Mark the student PRESENT or LATE on the linked session via{" "}
            <Link
              href={`/coach/cohorts/${cohortId}/attendance`}
              className="underline"
            >
              attendance
            </Link>{" "}
            to complete the make-up.
          </p>
        </Card>
      )}

      {/* Completed — fully delivered */}
      {grouped.completed.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Completed ({grouped.completed.length})
          </h2>
          <div className="space-y-2">
            {grouped.completed.map((o) => {
              const student = studentNameById.get(o.student_member_id);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-emerald-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {student?.name ?? o.student_member_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {REASON_LABEL[o.reason]} · completed{" "}
                      {o.completed_at ? formatDate(o.completed_at) : ""}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Expired / cancelled — record only */}
      {grouped.other.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Closed ({grouped.other.length})
          </h2>
          <div className="space-y-2">
            {grouped.other.map((o) => {
              const student = studentNameById.get(o.student_member_id);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 text-slate-600"
                >
                  <div>
                    <p className="font-medium">
                      {student?.name ?? o.student_member_id.slice(0, 8)}
                    </p>
                    <p className="text-xs">{REASON_LABEL[o.reason]}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[o.status]}>
                    {o.status}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
