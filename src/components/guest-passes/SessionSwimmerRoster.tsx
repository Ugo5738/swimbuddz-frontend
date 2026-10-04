"use client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import {
  OfflineSessionPaymentModal,
  type OfflineSessionPaymentInput,
} from "@/components/admin/OfflineSessionPaymentModal";
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
  const [offlinePaymentRow, setOfflinePaymentRow] = useState<RosterRow | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const generateWalkInPaymentLink = async (row: RosterRow) => {
    setSaving(row.id);
    setPaymentError(null);
    try {
      const result = await apiPost<{
        authorization_url: string;
        reference: string;
        amount: number;
      }>(
        `/api/v1/payments/admin/session-participants/${row.id}/payment-link`,
        {},
        { auth: true }
      );
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.authorization_url);
        toast.success("Paystack payment link copied");
      } else {
        window.prompt("Copy this payment link", result.authorization_url);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate payment link";
      setPaymentError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  };

  const recordWalkInOfflinePayment = async (
    row: RosterRow,
    input: OfflineSessionPaymentInput
  ) => {
    setSaving(row.id);
    setPaymentError(null);
    try {
      await apiPost(
        `/api/v1/payments/admin/session-participants/${row.id}/offline-payment`,
        input,
        { auth: true }
      );
      await roster.refetch();
      setOfflinePaymentRow(null);
      toast.success("Walk-in payment recorded through Payments");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not record walk-in payment";
      setPaymentError(message);
      throw e;
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
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={saving !== null}
                          onClick={() => void generateWalkInPaymentLink(row)}
                        >
                          Generate pay link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={saving !== null}
                          onClick={() => {
                            setPaymentError(null);
                            setOfflinePaymentRow(row);
                          }}
                        >
                          Record paid
                        </Button>
                      </div>
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

      {offlinePaymentRow && (
        <OfflineSessionPaymentModal
          memberName={offlinePaymentRow.full_name}
          amountNaira={(offlinePaymentRow.fee_amount_kobo || 0) / 100}
          paymentLabel="Walk-in guest fee"
          noteRequired
          submitting={saving === offlinePaymentRow.id}
          error={paymentError}
          onClose={() => {
            if (saving === null) {
              setOfflinePaymentRow(null);
              setPaymentError(null);
            }
          }}
          onSubmit={(input) => recordWalkInOfflinePayment(offlinePaymentRow, input)}
        />
      )}
    </Card>
  );
}
