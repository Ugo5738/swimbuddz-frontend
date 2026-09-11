"use client";
import { usePartnerPools } from "@/hooks/useLocationOptions";
import { MapPin } from "lucide-react";

export function OperatingLocations({ compact = false }: { compact?: boolean }) {
  const { data, isLoading, error, refetch } = usePartnerPools();
  if (isLoading)
    return (
      <p role="status" className="text-sm text-slate-500">
        Loading locations…
      </p>
    );
  if (error)
    return (
      <p role="status" className="text-sm text-slate-600">
        Locations are unavailable.{" "}
        <button
          type="button"
          className="min-h-11 font-semibold text-cyan-700"
          onClick={() => refetch()}
        >
          Try again
        </button>
      </p>
    );
  if (!data?.length)
    return (
      <p className="text-sm text-slate-600">
        New swimming locations will be listed here when available.
      </p>
    );
  if (compact)
    return (
      <p className="text-sm text-slate-600">
        {Array.from(new Set(data.map((pool) => pool.location_area || pool.name))).join(", ")}
      </p>
    );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.map((pool) => (
        <article
          key={pool.id}
          className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-cyan-700" />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">{pool.name}</h3>
            <p className="text-sm text-slate-600">
              {[pool.location_area, pool.address].filter(Boolean).join(" · ")}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
