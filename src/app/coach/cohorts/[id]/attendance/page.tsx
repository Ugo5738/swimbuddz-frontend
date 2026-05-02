"use client";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingCard } from "@/components/ui/LoadingCard";
import { Select } from "@/components/ui/Select";
import {
  type AttendanceStatus,
  type CoachAttendanceMarkEntry,
  type CoachSession,
  type Cohort,
  type Enrollment,
  type SessionAttendanceRecord,
  coachMarkSessionAttendance,
  getCohort,
  getCohortStudents,
  getMyCoachSessions,
  getSessionAttendance,
} from "@/lib/coach";
import { formatDate } from "@/lib/format";
import { ArrowLeft, CheckCircle, Clock, Save, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// Status options shown in the per-student selector. PRESENT is the default
// when no exception row exists; selecting it will delete any prior row.
const STATUS_OPTIONS: { value: AttendanceStatus; label: string; tone: string }[] = [
  { value: "present", label: "Present", tone: "text-emerald-700" },
  { value: "late", label: "Late", tone: "text-amber-700" },
  { value: "excused", label: "Excused (with notice)", tone: "text-blue-700" },
  { value: "absent", label: "Absent (no notice)", tone: "text-red-700" },
];

type StudentRowState = {
  member_id: string;
  member_name: string;
  member_email: string;
  // What the coach is editing right now
  status: AttendanceStatus;
  notes: string;
  // What's currently saved on the server (used to decide what to send)
  serverStatus: AttendanceStatus; // "present" if no row exists
  serverNotes: string;
};

export default function CoachCohortAttendancePage() {
  const params = useParams();
  const cohortId = params.id as string;

  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [students, setStudents] = useState<Enrollment[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [rows, setRows] = useState<StudentRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cohort, students, and the coach's sessions filtered to this cohort.
  useEffect(() => {
    if (!cohortId) return;
    (async () => {
      try {
        const [cohortData, studentsData, allSessions] = await Promise.all([
          getCohort(cohortId),
          getCohortStudents(cohortId),
          getMyCoachSessions(),
        ]);
        setCohort(cohortData);
        setStudents(
          studentsData.filter((s) =>
            ["enrolled", "dropout_pending", "dropped", "graduated"].includes(
              s.status as string,
            ),
          ),
        );
        const cohortSessions = allSessions
          .filter((s) => s.cohort_id === cohortId)
          .sort((a, b) =>
            // Most-recent-first; the coach is usually marking the latest session.
            b.starts_at.localeCompare(a.starts_at),
          );
        setSessions(cohortSessions);
        // Default to the most recent session that has already started, otherwise the first one.
        const now = new Date().toISOString();
        const past = cohortSessions.find((s) => s.starts_at <= now);
        setSelectedSessionId(past?.id ?? cohortSessions[0]?.id ?? "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load cohort";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [cohortId]);

  // When the selected session changes, fetch its existing attendance rows
  // and rebuild the per-student state.
  useEffect(() => {
    if (!selectedSessionId || students.length === 0) return;
    setLoadingSession(true);
    setSaveMessage(null);
    (async () => {
      try {
        const records: SessionAttendanceRecord[] =
          await getSessionAttendance(selectedSessionId);
        const recordByMember = new Map(records.map((r) => [r.member_id, r]));

        const newRows: StudentRowState[] = students.map((s) => {
          const rec = recordByMember.get(s.member_id);
          const status = (rec?.status ?? "present") as AttendanceStatus;
          const notes = rec?.notes ?? "";
          return {
            member_id: s.member_id,
            member_name: s.member_name ?? s.member_email ?? "(unnamed)",
            member_email: s.member_email ?? "",
            status,
            notes,
            serverStatus: status,
            serverNotes: notes,
          };
        });
        setRows(newRows);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load attendance";
        setError(msg);
      } finally {
        setLoadingSession(false);
      }
    })();
  }, [selectedSessionId, students]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const dirtyCount = rows.filter(
    (r) => r.status !== r.serverStatus || r.notes !== r.serverNotes,
  ).length;

  function updateRow(memberId: string, patch: Partial<StudentRowState>) {
    setRows((prev) =>
      prev.map((r) => (r.member_id === memberId ? { ...r, ...patch } : r)),
    );
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!selectedSessionId) return;
    // Send only rows that differ from the server state. PRESENT entries
    // for previously-recorded exceptions delete the row server-side.
    const entries: CoachAttendanceMarkEntry[] = rows
      .filter((r) => r.status !== r.serverStatus || r.notes !== r.serverNotes)
      .map((r) => ({
        member_id: r.member_id,
        status: r.status,
        notes: r.notes || null,
      }));

    if (entries.length === 0) {
      setSaveMessage({ type: "success", text: "No changes to save." });
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await coachMarkSessionAttendance(selectedSessionId, entries);
      setSaveMessage({
        type: "success",
        text: `Saved: ${result.upserted} updated, ${result.deleted} reverted to present.`,
      });
      // Update server-side baseline so the dirty indicator clears.
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          serverStatus: r.status,
          serverNotes: r.notes,
        })),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setSaveMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-semibold text-slate-900">Mark attendance</h1>
        <p className="text-sm text-slate-600">{cohort.name}</p>
      </div>

      {/* Help card explaining default-present */}
      <Alert variant="info">
        <strong>Default-present model:</strong> all enrolled students are
        treated as present unless you mark otherwise. Use <em>Excused</em> for
        absences with reasonable notice — these auto-create a make-up
        obligation that you'll reschedule later. Use <em>Absent</em> for no-shows
        without notice (counts as a held session for pay purposes).
      </Alert>

      {/* Session picker */}
      <Card className="p-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Session
        </label>
        <Select
          value={selectedSessionId}
          onChange={(e) => setSelectedSessionId(e.target.value)}
          disabled={sessions.length === 0}
        >
          <option value="">— Pick a session —</option>
          {sessions.map((s) => {
            const status = s.status;
            const dateStr = formatDate(s.starts_at);
            const labelExtra =
              status === "cancelled"
                ? " (cancelled)"
                : s.starts_at > new Date().toISOString()
                  ? " (upcoming)"
                  : "";
            return (
              <option key={s.id} value={s.id}>
                {dateStr} — {s.title || s.lesson_title || "Session"}
                {labelExtra}
              </option>
            );
          })}
        </Select>
        {sessions.length === 0 && (
          <p className="text-sm text-slate-500 mt-2">
            No sessions found for this cohort yet.
          </p>
        )}
        {selectedSession && (
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {formatDate(selectedSession.starts_at)}
            </span>
            {selectedSession.location_name && (
              <span>{selectedSession.location_name}</span>
            )}
            <Badge variant="default">{selectedSession.status}</Badge>
          </div>
        )}
      </Card>

      {/* Attendance grid */}
      {selectedSessionId && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Students ({rows.length})
            </h2>
            {dirtyCount > 0 && (
              <span className="text-sm text-amber-700">
                {dirtyCount} unsaved change{dirtyCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {loadingSession ? (
            <p className="text-sm text-slate-500">Loading attendance…</p>
          ) : rows.length === 0 ? (
            <Alert variant="info">
              No active enrollments found for this cohort.
            </Alert>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.member_id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 rounded-lg bg-slate-50"
                >
                  <div className="md:col-span-4">
                    <p className="font-medium text-slate-900">{row.member_name}</p>
                    <p className="text-xs text-slate-500">{row.member_email}</p>
                  </div>
                  <div className="md:col-span-3">
                    <Select
                      value={row.status}
                      onChange={(e) =>
                        updateRow(row.member_id, {
                          status: e.target.value as AttendanceStatus,
                        })
                      }
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="md:col-span-5">
                    <Input
                      placeholder={
                        row.status === "excused"
                          ? "Reason / notice given (optional)"
                          : "Notes (optional)"
                      }
                      value={row.notes}
                      onChange={(e) =>
                        updateRow(row.member_id, { notes: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {saveMessage && (
            <div className="mt-4">
              {saveMessage.type === "success" ? (
                <Alert variant="success">
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  {saveMessage.text}
                </Alert>
              ) : (
                <Alert variant="error">
                  <XCircle className="h-4 w-4 inline mr-1" />
                  {saveMessage.text}
                </Alert>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              variant="primary"
            >
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : "Save attendance"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
