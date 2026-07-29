"use client";

import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { formatBytes, type MediaVault } from "@/lib/media-vault";
import { Copy, Link2, RefreshCcw, Search, Shield, Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Grant = {
  id: string;
  member_id: string;
  role: "contributor" | "curator" | "admin";
  starts_at: string;
  expires_at: string;
  source: string;
  revoked_at: string | null;
};

type GuestLink = {
  id: string;
  label: string;
  expires_at: string;
  max_total_bytes: number;
  used_bytes: number;
  revoked_at: string | null;
  upload_url: string | null;
};

type MemberSearch = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export function VaultAccessPanel({ vault }: { vault: MediaVault }) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [query, setQuery] = useState("");
  const [allMembers, setAllMembers] = useState<MemberSearch[]>([]);
  const [members, setMembers] = useState<MemberSearch[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearch | null>(null);
  const [role, setRole] = useState<"contributor" | "curator">("contributor");
  const [newLink, setNewLink] = useState<GuestLink | null>(null);
  const [working, setWorking] = useState(false);
  const membersById = useMemo(
    () => new Map(allMembers.map((member) => [member.id, member])),
    [allMembers]
  );

  const load = useCallback(async () => {
    const [grantRows, linkRows] = await Promise.all([
      apiGet<Grant[]>(`/api/v1/media/vaults/${vault.id}/grants`, {
        auth: true,
      }),
      apiGet<GuestLink[]>(`/api/v1/media/vaults/${vault.id}/guest-links`, {
        auth: true,
      }),
    ]);
    setGrants(grantRows);
    setLinks(linkRows);
  }, [vault.id]);

  useEffect(() => {
    load().catch(() => undefined);
    apiGet<MemberSearch[]>("/api/v1/members/", { auth: true })
      .then(setAllMembers)
      .catch(() => setAllMembers([]));
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setMembers([]);
      return;
    }
    const timeout = setTimeout(() => {
      const normalized = query.trim().toLowerCase();
      setMembers(
        allMembers
          .filter((member) =>
            `${member.first_name} ${member.last_name} ${member.email}`
              .toLowerCase()
              .includes(normalized)
          )
          .slice(0, 8)
      );
    }, 200);
    return () => clearTimeout(timeout);
  }, [query, allMembers]);

  const addGrant = async () => {
    if (!selectedMember) return;
    setWorking(true);
    try {
      await apiPost(
        `/api/v1/media/vaults/${vault.id}/grants`,
        {
          member_id: selectedMember.id,
          role,
          starts_at: vault.upload_opens_at,
          expires_at:
            role === "curator"
              ? new Date(
                  new Date(vault.upload_closes_at).getTime() + 30 * 24 * 60 * 60 * 1000
                ).toISOString()
              : vault.upload_closes_at,
          can_download_originals: role === "curator",
        },
        { auth: true }
      );
      setSelectedMember(null);
      setQuery("");
      await load();
      toast.success("Vault access granted and notification sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add access");
    } finally {
      setWorking(false);
    }
  };

  const syncVolunteers = async () => {
    setWorking(true);
    try {
      await apiPost(`/api/v1/media/vaults/${vault.id}/grants/sync-volunteers`, {}, { auth: true });
      await load();
      toast.success("Volunteer assignments synchronized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setWorking(false);
    }
  };

  const createGuestLink = async () => {
    setWorking(true);
    try {
      const link = await apiPost<GuestLink>(
        `/api/v1/media/vaults/${vault.id}/guest-links`,
        {
          label: `Media handoff · ${vault.capture_date}`,
          expires_at: vault.upload_closes_at,
          max_total_bytes: 100 * 1024 ** 3,
        },
        { auth: true }
      );
      setNewLink(link);
      await load();
      toast.success("One-time upload link created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create link");
    } finally {
      setWorking(false);
    }
  };

  const revokeGrant = async (grantId: string) => {
    await apiDelete<void>(`/api/v1/media/vaults/${vault.id}/grants/${grantId}`, { auth: true });
    await load();
  };

  const revokeLink = async (linkId: string) => {
    await apiDelete<void>(`/api/v1/media/vaults/${vault.id}/guest-links/${linkId}`, { auth: true });
    await load();
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-slate-950">
              <Shield className="h-5 w-5 text-cyan-600" />
              Member access
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Media volunteers upload; gallery support reviews and downloads.
            </p>
          </div>
          <button
            type="button"
            onClick={syncVolunteers}
            disabled={working}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title="Sync volunteer assignments"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-5">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedMember(null);
            }}
            placeholder="Search members by name or email"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-500"
          />
          {members.length > 0 && !selectedMember && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setSelectedMember(member);
                    setQuery(`${member.first_name} ${member.last_name}`);
                    setMembers([]);
                  }}
                  className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">
                    {member.first_name} {member.last_name}
                  </span>
                  <span className="ml-2 text-slate-500">{member.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as "contributor" | "curator")}
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="contributor">Media uploader</option>
            <option value="curator">Social curator</option>
          </select>
          <button
            type="button"
            onClick={addGrant}
            disabled={!selectedMember || working}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Add
          </button>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {grants
            .filter((grant) => !grant.revoked_at)
            .map((grant) => {
              const member = membersById.get(grant.member_id);
              return (
                <div key={grant.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {member ? `${member.first_name} ${member.last_name}` : grant.member_id}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member?.email && `${member.email} · `}
                      {grant.role} · {grant.source.replaceAll("_", " ")} · expires{" "}
                      {new Date(grant.expires_at).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeGrant(grant.id)}
                    aria-label="Revoke access"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                  </button>
                </div>
              );
            })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-950">
          <Link2 className="h-5 w-5 text-indigo-600" />
          Guest upload links
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          For a photographer without a SwimBuddz account. The secret is shown once and expires with
          the upload window.
        </p>
        <button
          type="button"
          onClick={createGuestLink}
          disabled={working}
          className="mt-5 w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
        >
          Create 100 GB guest link
        </button>
        {newLink?.upload_url && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800">
              Copy this now — it cannot be retrieved later.
            </p>
            <div className="mt-2 flex gap-2">
              <input
                readOnly
                value={newLink.upload_url}
                className="min-w-0 flex-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newLink.upload_url!);
                  toast.success("Upload link copied");
                }}
                className="rounded-lg bg-emerald-700 p-2 text-white"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="mt-5 divide-y divide-slate-100">
          {links
            .filter((link) => !link.revoked_at)
            .map((link) => (
              <div key={link.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{link.label}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(link.used_bytes)} of {formatBytes(link.max_total_bytes)} · expires{" "}
                    {new Date(link.expires_at).toLocaleString("en-NG")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revokeLink(link.id)}
                  aria-label="Revoke guest link"
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
