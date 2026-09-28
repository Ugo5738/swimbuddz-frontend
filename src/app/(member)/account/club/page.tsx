"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { apiPost } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";

type QuarterSwim = { id: string; session_id: string; session_title: string;
  session_starts_at: string; location_name: string | null; status: string; session_status: string };

export default function MyClubSwimsPage() {
  const swims = useApi<QuarterSwim[]>("/api/v1/sessions/bookings/me/club-quarter");
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
  if (swims.loading) return <LoadingCard text="Loading your Club swims…" />;
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold">Your quarter swims</h1>
    <p>Your prepaid quarter reserves these swims automatically. Cancel attendance when you cannot come; this frees your seat and does not refund your quarter payment.</p>
    {(error || swims.error) && <Alert variant="error">{error || swims.error}</Alert>}
    {!swims.data?.length && <Card>No upcoming prepaid reservations. <Link href="/sessions" className="text-cyan-700 underline">Browse sessions</Link></Card>}
    {swims.data?.map((swim) => <Card key={swim.id} className="space-y-3 p-4">
      <Link href={`/sessions/${swim.session_id}`} className="font-semibold text-cyan-800">{swim.session_title}</Link>
      <p>{new Date(swim.session_starts_at).toLocaleString()} · {swim.location_name}</p>
      <p>{swim.session_status === "cancelled" ? "Swim cancelled" : swim.status === "confirmed" ? "You’re attending ✓ · Included in your quarter" : "Attendance cancelled"}</p>
      {swim.status === "confirmed" && swim.session_status === "scheduled" && <Button variant="outline" disabled={!!busy} onClick={() => cancel(swim.id)}>
        {busy === swim.id ? "Cancelling…" : "Can’t make this swim? Cancel attendance"}
      </Button>}
      {swim.status === "cancelled" && swim.session_status === "scheduled" && <Link href={`/sessions/${swim.session_id}/book`} className="text-cyan-700 underline">Reserve again, subject to available space</Link>}
    </Card>)}
  </div>;
}
