"use client";

// HR dashboard — lists the company's corporate programs.
// Requires an active portal session in localStorage; on miss, redirects
// back to the magic-link request screen.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Calendar, Users } from "lucide-react";

import { PortalNav } from "@/components/corporate/PortalNav";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
  type PortalProgramSummary,
  type PortalSession,
  loadPortalSession,
  portalApi,
} from "@/lib/corporate/portal-api";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  ready: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  completed: "bg-indigo-100 text-indigo-800",
  cancelled: "bg-rose-100 text-rose-800",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PortalDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<PortalSession | null>(null);
  const [programs, setPrograms] = useState<PortalProgramSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sess = loadPortalSession();
    if (!sess) {
      router.replace("/corporate-portal");
      return;
    }
    setSession(sess);
    let cancelled = false;
    portalApi
      .listPrograms()
      .then((list) => {
        if (!cancelled) setPrograms(list);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Failed to load programs";
        setError(msg);
        // If the session was rejected, bounce to login.
        if (msg.toLowerCase().includes("token") || msg.includes("401")) {
          router.replace("/corporate-portal");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!session) return null; // mid-redirect

  return (
    <div className="space-y-6">
      <PortalNav session={session} />

      <header>
        <h1 className="text-2xl font-bold text-slate-900">Programs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Wellness cohorts your team is currently part of.
        </p>
      </header>

      {!programs && !error && <LoadingCard text="Loading programs…" />}

      {error && (
        <Card className="border-rose-200 bg-rose-50 text-rose-900">
          <p className="font-medium">Couldn&apos;t load programs</p>
          <p className="mt-1 text-sm">{error}</p>
        </Card>
      )}

      {programs && programs.length === 0 && (
        <Card>
          <p className="text-slate-700">
            No programs are linked to your company yet. If this seems wrong,
            email{" "}
            <a
              className="text-sky-700 underline underline-offset-2"
              href="mailto:swimbuddz@gmail.com"
            >
              swimbuddz@gmail.com
            </a>{" "}
            and we&apos;ll sort it out.
          </p>
        </Card>
      )}

      {programs && programs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.map((p) => (
            <Link
              key={p.id}
              href={`/corporate-portal/programs/${p.id}`}
              className="block transition-shadow hover:shadow-md"
            >
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {p.name}
                  </h2>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status] || "bg-slate-100 text-slate-700"}`}
                  >
                    {STATUS_LABELS[p.status] || p.status}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">
                      <Users className="inline h-3 w-3" /> Employees
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {p.employee_count}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-400">
                      <Calendar className="inline h-3 w-3" /> Starts
                    </dt>
                    <dd className="font-medium text-slate-900">
                      {formatDate(p.actual_start_date || p.expected_start_date)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sky-700">
                  View details <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
