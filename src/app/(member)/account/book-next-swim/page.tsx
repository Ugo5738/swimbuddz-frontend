"use client";

import { apiGet } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RecommendedSession = {
  id: string;
  title: string;
  starts_at: string;
  location_name?: string | null;
  access?: { bookable?: boolean; fee_amount_kobo?: number | null } | null;
};
type NextSwimResult = {
  primary: RecommendedSession | null;
  alternatives: RecommendedSession[];
  next_confirmed: RecommendedSession | null;
};

/** A navigation shortcut, not another browsing catalogue.
 * The backend alone chooses and validates the candidate; checkout rechecks
 * capacity, entitlements and final price before a reservation is confirmed.
 */
export default function BookNextSwimPage() {
  const router = useRouter();
  const [result, setResult] = useState<NextSwimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    apiGet<NextSwimResult>("/api/v1/sessions/me/next-swim", { auth: true })
      .then((response) => {
        if (!active) return;
        if (response.primary?.id && response.primary.access?.bookable === true) {
          router.replace(`/sessions/${encodeURIComponent(response.primary.id)}/book?source=next-swim`);
          return;
        }
        setResult(response);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not find your next swim.");
      });
    return () => { active = false; };
  }, [router, retry]);

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Quick booking</p>
      <h1 className="text-3xl font-bold text-slate-950">Book My Next Swim</h1>
      {!result && !error ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700">
          Finding your next eligible, unbooked session…
        </div>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <p className="font-medium text-rose-900">We couldn't check your next swim.</p>
          <p className="text-sm text-rose-800">{error}</p>
          <button type="button" className="rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white"
            onClick={() => { setError(null); setResult(null); setRetry((value) => value + 1); }}>Try again</button>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">No suitable unbooked swim was found in the checked schedule.</p>
          {result?.next_confirmed && (
            <div className="rounded-xl bg-cyan-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Your next confirmed swim</p>
              <p className="mt-1 font-semibold text-slate-900">{result.next_confirmed.title}</p>
              <p className="text-sm text-slate-700">{new Date(result.next_confirmed.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</p>
              <Link href={`/sessions/${result.next_confirmed.id}`} className="mt-2 inline-block text-sm font-semibold text-cyan-800 underline">View your swim</Link>
            </div>
          )}
          <p className="text-sm text-slate-600">Try another day or explore sessions and independent Pool Access. No unrelated session will be booked automatically.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/account/find-a-swim" className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white">Find a Swim</Link>
            <Link href="/account/bookings" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">My Swims</Link>
          </div>
        </div>
      )}
      <Link href="/pools" className="inline-block text-sm font-semibold text-cyan-700 underline">Explore swimming pools</Link>
    </main>
  );
}
