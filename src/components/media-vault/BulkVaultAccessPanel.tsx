"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { MediaVault } from "@/lib/media-vault";
import { ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

type Member = { id: string; first_name: string; last_name: string; email: string };
type BulkResult = { granted_count: number; vault_ids: string[] };

export function BulkVaultAccessPanel({ vaults }: { vaults: MediaVault[] }) {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<Member[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [scope, setScope] = useState<"all_current" | "selected">("selected");
  const [selected, setSelected] = useState<string[]>([]);
  const [role, setRole] = useState<"curator" | "contributor">("curator");
  const [days, setDays] = useState(90);
  const [busy, setBusy] = useState(false);
  const eligible = useMemo(
    () => vaults.filter((vault) => vault.status !== "archived"),
    [vaults]
  );

  useEffect(() => {
    if (member || search.trim().length < 2) {
      setMatches([]);
      return;
    }
    let live = true;
    const timer = setTimeout(() => {
      apiGet<Member[]>(
        `/api/v1/members/?limit=20&search=${encodeURIComponent(search.trim())}`,
        { auth: true }
      ).then((rows) => {
        if (live) setMatches(rows.slice(0, 10));
      }).catch(() => {
        if (live) setMatches([]);
      });
    }, 250);
    return () => { live = false; clearTimeout(timer); };
  }, [search, member]);

  const grantAccess = async () => {
    if (!member || (scope === "selected" && selected.length === 0)) return;
    setBusy(true);
    try {
      const now = new Date();
      const expiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const result = await apiPost<BulkResult>(
        "/api/v1/media/vaults/grants/bulk",
        {
          member_id: member.id,
          role,
          scope,
          vault_ids: scope === "selected" ? selected : [],
          starts_at: now.toISOString(),
          expires_at: expiry.toISOString(),
          can_download_originals: role === "curator",
        },
        { auth: true }
      );
      toast.success(`Granted ${role} access to ${result.granted_count} vaults`);
      setSelected([]);
      setSearch("");
      setMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grant access");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Bulk vault access">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 text-cyan-700" />
        <div>
          <h2 className="font-semibold text-slate-900">Share access across vaults</h2>
          <p className="text-sm text-slate-600">
            Give a media volunteer access to several vaults at once, without assigning each one separately.
          </p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative lg:col-span-2">
          <label htmlFor="bulk-vault-member" className="block text-sm font-medium text-slate-700">Member</label>
          <input id="bulk-vault-member" value={search} onChange={(event) => { setSearch(event.target.value); setMember(null); }}
            placeholder="Search by name or email" autoComplete="off"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          {matches.length > 0 && !member && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {matches.map((entry) => (
                <button type="button" key={entry.id} onClick={() => {
                  setMember(entry); setSearch(`${entry.first_name} ${entry.last_name} (${entry.email})`); setMatches([]);
                }} className="block w-full px-3 py-2 text-left text-sm hover:bg-cyan-50">
                  {entry.first_name} {entry.last_name} · {entry.email}
                </button>
              ))}
            </div>
          )}
          {member && <p className="mt-1 text-xs text-emerald-700">Selected: {member.email}</p>}
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Permission
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="curator">Curator — review and download</option>
            <option value="contributor">Contributor — upload own media</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="vault-access-scope" checked={scope === "selected"} onChange={() => setScope("selected")} />
          Selected vaults
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="radio" name="vault-access-scope" checked={scope === "all_current"} onChange={() => setScope("all_current")} />
          All existing vaults ({eligible.length})
        </label>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-700">
          Access expires in
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
        </label>
      </div>
      {role === "contributor" && (
        <p className="text-xs text-amber-800">
          Contributor access also opens the selected vault upload windows until this access expires.
        </p>
      )}
      {scope === "selected" && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2" role="group" aria-label="Choose vaults">
          {eligible.map((vault) => (
            <label key={vault.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
              <input type="checkbox" checked={selected.includes(vault.id)} onChange={(event) =>
                setSelected((old) => event.target.checked ? [...old, vault.id] : old.filter((id) => id !== vault.id))
              } />
              <span className="min-w-0 flex-1 truncate">{vault.title}</span>
              <span className="text-xs text-slate-500">{vault.capture_date}</span>
            </label>
          ))}
          {!eligible.length && <p className="p-2 text-sm text-slate-500">No eligible vaults.</p>}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Existing vaults only. New vaults and administrative settings are not automatically shared.
        </p>
        <button type="button" onClick={grantAccess}
          disabled={busy || !member || !eligible.length || (scope === "selected" && !selected.length)}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Users className="h-4 w-4" />
          {busy ? "Granting…" : `Grant access to ${scope === "all_current" ? eligible.length : selected.length} vaults`}
        </button>
      </div>
    </section>
  );
}
