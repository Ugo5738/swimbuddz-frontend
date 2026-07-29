"use client";

import { useApi } from "@/hooks/useApi";
import { formatBytes, type VaultList } from "@/lib/media-vault";
import { CalendarDays, ChevronRight, CloudUpload, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function MemberMediaVaultPage() {
  const { data, loading, error } = useApi<VaultList>("/api/v1/media/vaults");

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-cyan-600 p-3">
            <CloudUpload className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Media assignments</h1>
            <p className="text-sm text-slate-600">
              Private session handoffs assigned through the volunteer roster.
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}
      {!loading && !error && !data?.items.length && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
          <h2 className="mt-3 font-semibold text-slate-900">No active media assignment</h2>
          <p className="mt-1 text-sm text-slate-500">
            Media and gallery-support volunteer assignments will appear here.
          </p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.items.map((vault) => (
          <Link
            href={`/account/media-vault/${vault.id}`}
            key={vault.id}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700">
                  {vault.effective_role}
                </span>
                <h2 className="mt-3 text-lg font-bold text-slate-900">{vault.title}</h2>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-cyan-600" />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(`${vault.capture_date}T12:00:00`).toLocaleDateString("en-NG", {
                  dateStyle: "long",
                })}
              </p>
              {vault.location_name && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {vault.location_name}
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {vault.item_count} files · {formatBytes(vault.used_bytes)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
