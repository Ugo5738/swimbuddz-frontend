"use client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { markGuestPassAttendance } from "@/lib/guestPasses";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type RosterRow = {
  id: string;
  kind: "member" | "booking_guest" | "guest_pass";
  full_name: string;
  booking_status: string;
  attendance_status: string | null;
  inviter: string | null;
  booking_mode: string | null;
  actual_swim_minutes: number | null;
};
type Roster = { entries: RosterRow[]; attendance_available: boolean };
const labels = {
  member: "Member",
  booking_guest: "Guest on member booking",
  guest_pass: "Self-paying guest",
};

export function SessionSwimmerRoster({ sessionId }: { sessionId: string }) {
  const roster = useApi<Roster>(`/api/v1/admin/sessions/${sessionId}/roster`);
  const [minutes, setMinutes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const attend = async (row: RosterRow) => {
    setSaving(row.id);
    try {
      await markGuestPassAttendance(row.id, {
        actual_swim_minutes: Number(minutes[row.id] || 0),
        send_assessment_email: false,
      });
      roster.refetch();
      toast.success("Guest attendance recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save attendance");
    } finally {
      setSaving(null);
    }
  };
  const rows = (roster.data?.entries ?? []).filter((row) =>
    `${row.full_name} ${labels[row.kind]} ${row.inviter || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">All swimmers</h2>
        <p className="text-sm text-slate-600">
          Members, guests on member bookings and self-paying guests in one roster.
        </p>
      </div>
      {roster.loading && <p className="text-sm">Loading swimmer roster...</p>}
      {roster.error && (
        <Alert variant="error">
          {roster.error}{" "}
          <button onClick={roster.refetch} className="underline">
            Retry
          </button>
        </Alert>
      )}
      {roster.data && !roster.data.attendance_available && (
        <Alert>
          Member attendance is temporarily unavailable. Booking and guest-pass details are still
          shown.
        </Alert>
      )}
      <input
        aria-label="Search all swimmers"
        placeholder="Search swimmers or inviter"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border p-2 text-sm"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="p-2">Swimmer</th>
              <th className="p-2">Booking</th>
              <th className="p-2">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="border-b border-slate-100 align-top">
                <td className="p-2">
                  <p className="font-medium">{row.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {labels[row.kind]}
                    {row.inviter ? ` · ${row.inviter}` : ""}
                  </p>
                </td>
                <td className="p-2">
                  {row.booking_status.replaceAll("_", " ")}
                  {row.booking_mode === "settlement" && (
                    <p className="text-xs text-slate-500">Post-start settlement</p>
                  )}
                </td>
                <td className="p-2">
                  <p>{row.attendance_status || "Not recorded"}</p>
                  {row.kind === "guest_pass" &&
                    row.booking_status === "confirmed" &&
                    !row.attendance_status && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          aria-label={`Swim minutes for ${row.full_name}`}
                          placeholder="Minutes"
                          type="number"
                          min={0}
                          max={1440}
                          value={minutes[row.id] ?? ""}
                          onChange={(e) => setMinutes({ ...minutes, [row.id]: e.target.value })}
                          className="w-24 rounded border p-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            saving !== null ||
                            !minutes[row.id] ||
                            Number(minutes[row.id]) < 0 ||
                            Number(minutes[row.id]) > 1440
                          }
                          onClick={() => void attend(row)}
                        >
                          Mark attended
                        </Button>
                      </div>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!roster.loading && !roster.error && !rows.length && (
        <p className="text-sm text-slate-500">No swimmers found.</p>
      )}
      <Link
        href={`/admin/guest-passes?session_id=${sessionId}`}
        className="text-sm font-medium text-cyan-700 underline"
      >
        Guest payments and assessments
      </Link>
    </Card>
  );
}
