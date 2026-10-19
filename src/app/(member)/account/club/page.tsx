"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import type { Session } from "@/lib/sessions";

type QuarterSwim = { id: string; session_id: string; session_title: string;
  session_starts_at: string; location_name: string | null; status: string; session_status: string };

export default function MyClubSwimsPage() {
  const swims = useApi<QuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter");
  const available = useApi<Session[]>("/api/v1/sessions?types=club&limit=100");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const cancel = async (id: string) => {
    setBusy(id); setError("");
    try {
      await apiPost(`/api/v1/sessions/bookings/${id}/cancel`, {}, { auth: true });
      swims.refetch();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not cancel attendance"); }
    finally { setBusy(null); }
  };
  if (swims.loading || available.loading) return <LoadingCard text="Loading your Club swims…" />;
  const reservedIds = new Set((swims.data ?? []).filter((swim) => swim.status === "confirmed").map((swim) => swim.session_id));
  const bookable = (available.data ?? []).filter((swim) => swim.access?.bookable && !reservedIds.has(swim.id));
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold">Your Club swims</h1>
    <p>Book available swims below. Pay-per-swim access does not create reservations automatically.</p>
    {(error || swims.error || available.error) && <Alert variant="error">{error || swims.error || available.error}</Alert>}
    <h2 className="text-xl font-semibold">Prepaid quarter reservations</h2>
    <p>Cancel attendance when you cannot come; this frees your seat and does not refund your quarter payment.</p>
    {!swims.data?.length && <Card>No upcoming prepaid reservations. You can still book eligible Club swims below.</Card>}
    {swims.data?.map((swim) => <Card key={swim.id} className="space-y-3 p-4">
      <Link href={`/sessions/${swim.session_id}/book`} className="font-semibold text-cyan-800">{swim.session_title}</Link>
      <p>{new Date(swim.session_starts_at).toLocaleString()} · {swim.location_name}</p>
      <p>{swim.session_status === "cancelled" ? "Swim cancelled" : swim.status === "confirmed" ? "You’re attending ✓ · Included in your quarter" : "Attendance cancelled"}</p>
      {swim.status === "confirmed" && swim.session_status === "scheduled" && <Button variant="outline" disabled={!!busy} onClick={() => cancel(swim.id)}>
        {busy === swim.id ? "Cancelling…" : "Can’t make this swim? Cancel attendance"}
      </Button>}
      {swim.status === "cancelled" && swim.session_status === "scheduled" && <Link href={`/sessions/${swim.session_id}/book`} className="text-cyan-700 underline">Reserve again, subject to available space</Link>}
    </Card>)}
    <h2 className="text-xl font-semibold">Available Club swims</h2>
    {bookable.map((swim) => <Card key={swim.id} className="space-y-3 p-4">
      <h3 className="font-semibold">{swim.title}</h3>
      <p>{new Date(swim.starts_at).toLocaleString()} · {swim.location_name || swim.location}</p>
      <p>{swim.access?.price_label || "Session rate"} · ₦{((swim.access?.fee_amount_kobo ?? (swim.pool_fee || 0) * 100) / 100).toLocaleString()}</p>
      <Link href={`/sessions/${swim.id}/book`} className="font-medium text-cyan-700 underline">Book swim</Link>
    </Card>)}
    {!bookable.length && <Card>No additional Club swims are available to book. <Link href="/sessions?view=past" className="text-cyan-700 underline">View past sessions</Link></Card>}
  </div>;
}
