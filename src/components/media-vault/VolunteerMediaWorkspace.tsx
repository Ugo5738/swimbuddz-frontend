"use client";

import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { type VaultList, type MediaVault } from "@/lib/media-vault";
import { VaultLibrary } from "./VaultLibrary";

const privileged = new Set(["contributor","curator","admin"]);
function isAssigned(vault: MediaVault): boolean {
  return privileged.has(vault.effective_role || "");
}

export function VolunteerMediaWorkspace({ library = false }: {library?: boolean}) {
  const {data, loading, error} = useApi<VaultList>("/api/v1/media/vaults");
  const vaults = (data?.items || []).filter(isAssigned);
  if (loading) return <p role="status" className="p-4 text-sm">Loading your media assignments…</p>;
  if (error) return <p role="alert" className="rounded-xl border p-4 text-sm">Could not load your assigned vaults: {error}</p>;
  if (!vaults.length) return <section className="rounded-xl border p-6">
    <h2 className="font-semibold">No volunteer media assignments</h2>
    <p className="mt-2 text-sm text-slate-600">A vault must be assigned with contributor, curator, or admin access before volunteer media tools appear here. Attendee viewing access does not count as a volunteer assignment.</p>
    <Link href="/community/volunteers" className="mt-3 inline-block text-sm font-semibold text-cyan-700 underline">Go to Volunteer Hub</Link>
  </section>;
  if (library) return <VaultLibrary vaults={vaults}/>;
  return <section className="space-y-3">
    <h2 className="text-lg font-semibold">My volunteer media assignments</h2>
    <p className="text-sm text-slate-600">Only vaults where you have a contributor, curator, or admin role are listed. Existing vault permissions still govern uploads and approvals.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {vaults.map(v=><Link key={v.id} href={v.session_id ? `/account/media-vault?session=${encodeURIComponent(v.session_id)}&action=contribute` : "/account/media-vault?view=volunteer"}
        className="rounded-xl border bg-white p-4 hover:border-cyan-300">
        <strong className="block">{v.title}</strong><span className="text-sm text-slate-600">{v.location_name || "Media vault"} · {v.effective_role}</span>
        <span className="mt-2 block text-sm font-semibold text-cyan-700">Open assigned media</span>
      </Link>)}
    </div>
  </section>;
}
