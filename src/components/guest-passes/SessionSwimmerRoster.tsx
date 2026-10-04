"use client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { apiPatch } from "@/lib/api";
import { markGuestPassAttendance } from "@/lib/guestPasses";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type RosterRow = {
  id: string;
  kind: "member" | "booking_guest" | "guest_pass" | "walk_in_guest";
  full_name: string;
  booking_status: string;
  attendance_status: string | null;
  inviter: string | null;
  booking_mode: string | null;
  actual_swim_minutes: number | null;
  fee_amount_kobo?: number | null;
  payment_status?: string | null;
  waiver_status?: string | null;
};
type Roster = { entries: RosterRow[]; attendance_available: boolean };
const labels = {
  member: "Member",
  booking_guest: "Guest on member booking",
  guest_pass: "Self-paying guest",
  walk_in_guest: "Walk-in guest",
};

export function SessionSwimmerRoster({ sessionId }: { sessionId: string }) {
  const roster = useApi<Roster>(`/api/v1/admin/sessions/${sessionId}/roster`);
  const [minutes, setMinutes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const reconcileWalkInPayment = async (row: RosterRow) => {
    const method = window.prompt(
      `Payment method for ${row.full_name} (for example: bank_transfer, cash, paystack):`,
      "bank_transfer"
    );
    if (!method?.trim()) return;
    const reference = window.prompt(
      "Payment reference (recommended; leave blank only if none exists):",
      ""
    );
    const note = window.prompt(
      "Reconciliation note (how was this payment verified?):",
      ""
    );
    if (!note?.trim()) {
      toast.error("A reconciliation note is required.");
      return;
    }
    setSaving(row.id);
    try {
      await apiPatch(
        `/api/v1/admin/session-participants/${row.id}/payment`,
        {
          payment_status: "paid",
          payment_method: method.trim(),
          ...(reference?.trim() ? { payment_reference: reference.trim() } : {}),
          note: note.trim(),
        },
        { auth: true }
      );
      await roster.refetch();
      toast.success("Walk-in payment reconciled");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reconcile payment");
    } finally {
      setSaving(null);
    }
  };
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
          Members, guests on member bookings, self-paying guests and door walk-ins in one roster.
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
                  {row.kind === "walk_in_guest" && row.fee_amount_kobo != null && (
                    <p className="text-xs text-slate-500">
                      ₦{(row.fee_amount_kobo / 100).toLocaleString("en-NG")} ·{" "}
                      {(row.payment_status || "unreconciled").replaceAll("_", " ")}
                    </p>
                  )}
                  {row.kind === "walk_in_guest" &&
                    row.fee_amount_kobo != null &&
                    row.fee_amount_kobo > 0 &&
                    row.payment_status !== "paid" &&
                    row.payment_status !== "waived" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        disabled={saving !== null}
                        onClick={() => void reconcileWalkInPayment(row)}
                      >
                        Record verified payment
                      </Button>
                    )}
                  {row.booking_mode === "settlement" && (
                    <p className="text-xs text-slate-500">Post-start settlement</p>
                  )}
                </td>
                <td className="p-2">
                  <p>{row.attendance_status || "Not recorded"}</p>
                  {row.kind === "walk_in_guest" && row.waiver_status === "missing" && (
                    <p className="text-xs text-amber-700">Waiver follow-up required</p>
                  )}
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
