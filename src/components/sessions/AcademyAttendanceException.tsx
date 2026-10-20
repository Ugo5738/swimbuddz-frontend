"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";

type Status = "present" | "absent" | "excused" | "late";

export function AcademyAttendanceException({ sessionId, startsAt, attendanceStatus }: {
  sessionId: string;
  startsAt: string;
  attendanceStatus?: string;
}) {
  const initial = ["absent", "excused", "late"].includes(attendanceStatus ?? "")
    ? attendanceStatus as Status : "present";
  const [saved, setSaved] = useState<Status>(initial);
  const [choice, setChoice] = useState<"present" | "absence" | "late">(
    initial === "absent" || initial === "excused" ? "absence" : initial
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const report = async () => {
    setSaving(true); setError(""); setMessage("");
    const status: Status = choice === "absence"
      ? new Date(startsAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000 ? "excused" : "absent"
      : choice;
    try {
      const result = await apiPost<{ status: Status }>(
        `/api/v1/attendance/sessions/${sessionId}/my-academy-attendance`,
        { status, notes: notes.trim() || null }, { auth: true }
      );
      setSaved(result.status);
      setMessage("Your attendance update has been saved for your coach.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your attendance. Try again.");
    } finally { setSaving(false); }
  };

  return <details className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3">
    <summary className="cursor-pointer text-sm font-semibold text-cyan-900">Update my Academy attendance</summary>
    <p className="mt-2 text-xs text-slate-600">You default to Present. Let your coach know if you cannot attend or will be late.</p>
    <p className="mt-1 text-xs text-slate-700">Current attendance: <span className="capitalize">{saved}</span></p>
    <label className="mt-3 block text-sm font-medium">
      My attendance
      <select value={choice} onChange={event => setChoice(event.target.value as typeof choice)} disabled={saving}
        className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
        <option value="present">I will attend</option>
        <option value="absence">I cannot attend</option>
        <option value="late">I will be late</option>
      </select>
    </label>
    <label className="mt-3 block text-sm font-medium">
      Note for my coach (optional)
      <textarea value={notes} maxLength={500} disabled={saving} onChange={event => setNotes(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" rows={2} />
    </label>
    <button type="button" disabled={saving} onClick={() => void report()}
      className="mt-3 min-h-11 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
      {saving ? "Saving…" : "Save attendance update"}
    </button>
    {message && <p role="status" className="mt-2 text-sm text-emerald-800">{message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </details>;
}
