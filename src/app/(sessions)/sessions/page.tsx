import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { mockSessions } from "./data";

function formatDate(date: string, start: string, end: string) {
  const formattedDate = new Date(date).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  return `${formattedDate} • ${start} – ${end}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value);
}

export default function SessionsPage() {
  // TODO: Replace mockSessions with apiGet("/api/v1/sessions", { auth: true })
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-600">Sessions</p>
        <h1 className="text-4xl font-bold text-slate-900">Upcoming swims</h1>
        <p className="text-base text-slate-600">
          This page uses mock data for now. Once the backend endpoint is available we will hydrate it with real sessions for logged-in members.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {mockSessions.map((session) => (
          <Card key={session.id} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900">{session.title}</h2>
                <p className="text-sm text-slate-500">{session.location}</p>
              </div>
              <Badge variant="info">{session.type}</Badge>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {formatDate(session.date, session.startTime, session.endTime)}
            </p>
            <p className="text-sm text-slate-600">{session.description}</p>
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Pool fee</p>
                <p className="font-semibold text-slate-900">{formatCurrency(session.poolFee)}</p>
              </div>
              {session.rideShareFee ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Ride-share</p>
                  <p className="font-semibold text-slate-900">{formatCurrency(session.rideShareFee)}</p>
                </div>
              ) : null}
            </div>
            <Link
              href={`/sessions/${session.id}/sign-in`}
              className="inline-flex font-semibold text-cyan-700 hover:underline"
            >
              Sign in &rarr;
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
