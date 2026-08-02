"use client";

import { useApi } from "@/hooks/useApi";
import { formatBytes, mediaVaultApi, type VaultList } from "@/lib/media-vault";
import { SessionsApi, type Session } from "@/lib/sessions";
import {
  CalendarDays,
  ChevronRight,
  Database,
  HardDrive,
  Plus,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const DEFAULT_SHOTS = [
  "Wide establishing shot",
  "Swimmers in action",
  "Coach or volunteer moments",
  "Community/candid moments",
  "One vertical social clip",
  "Sponsor or venue details",
];

export default function AdminMediaVaultPage() {
  const router = useRouter();
  const { data, loading, error, refetch } = useApi<VaultList>("/api/v1/media/vaults");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    SessionsApi.listAllSessions({ include_drafts: true })
      .then((rows) =>
        setSessions(
          rows
            .filter((session) => session.status !== "cancelled")
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
        )
      )
      .catch(() => setSessions([]));
  }, []);

  const selectedSession = sessions.find((session) => session.id === sessionId);
  const stats = useMemo(() => {
    const items = data?.items ?? [];
    return {
      vaults: items.length,
      files: items.reduce((sum, vault) => sum + vault.item_count, 0),
      bytes: items.reduce((sum, vault) => sum + vault.used_bytes, 0),
      review: items.reduce((sum, vault) => sum + vault.pending_review_count, 0),
    };
  }, [data]);

  const createVault = async () => {
    if (!selectedSession) {
      toast.error("Choose a session");
      return;
    }
    setSubmitting(true);
    try {
      const startsAt = new Date(selectedSession.starts_at);
      const endsAt = new Date(selectedSession.ends_at);
      const created = await mediaVaultApi.create({
        title: selectedSession.title,
        description: selectedSession.description || null,
        session_id: selectedSession.id,
        capture_date: selectedSession.starts_at.slice(0, 10),
        starts_at: selectedSession.starts_at,
        ends_at: selectedSession.ends_at,
        timezone: selectedSession.timezone || "Africa/Lagos",
        location_name: selectedSession.location_name || null,
        upload_opens_at: new Date(startsAt.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        upload_closes_at: new Date(endsAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        retention_days: 730,
        consent_notice:
          "Confirm participants have not opted out of photography and flag any safeguarding concern in the upload notes.",
        shot_checklist: DEFAULT_SHOTS,
      });
      toast.success("Private vault created");
      refetch();
      router.push(`/admin/media-vault/${created.id}`);
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "Could not create vault");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-3 shadow-lg">
            <HardDrive className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Media Vault</h1>
            <p className="mt-1 text-slate-600">
              Private, full-quality session capture and social handoff.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500"
        >
          <Plus className="h-5 w-5" />
          New session vault
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Vaults",
            value: stats.vaults.toString(),
            icon: ShieldCheck,
          },
          {
            label: "Original files",
            value: stats.files.toLocaleString(),
            icon: UploadCloud,
          },
          {
            label: "Private storage",
            value: formatBytes(stats.bytes),
            icon: Database,
          },
          {
            label: "Awaiting review",
            value: stats.review.toLocaleString(),
            icon: CalendarDays,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <stat.icon className="h-5 w-5 text-cyan-600" />
            <p className="mt-4 text-2xl font-bold text-slate-950">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Session vaults</h2>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="p-12 text-center text-slate-500">
            Create a vault from a scheduled session to get started.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((vault) => (
              <Link
                key={vault.id}
                href={`/admin/media-vault/${vault.id}`}
                className="flex items-center gap-4 px-6 py-5 transition hover:bg-slate-50"
              >
                <div className="hidden rounded-xl bg-cyan-50 p-3 sm:block">
                  <CalendarDays className="h-5 w-5 text-cyan-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-900">{vault.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-600">
                      {vault.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(`${vault.capture_date}T12:00:00`).toLocaleDateString("en-NG", {
                      dateStyle: "medium",
                    })}
                    {" · "}
                    {vault.item_count} files · {formatBytes(vault.used_bytes)}
                  </p>
                </div>
                {vault.pending_review_count > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                    {vault.pending_review_count} to review
                  </span>
                )}
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Create session vault</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Date, venue and volunteers are pulled from the session.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <label className="mt-6 block text-sm font-medium text-slate-700">
              Session
              <select
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 outline-none focus:border-cyan-500"
              >
                <option value="">Choose a session…</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {new Date(session.starts_at).toLocaleDateString("en-NG")} · {session.title}
                  </option>
                ))}
              </select>
            </label>
            {selectedSession && (
              <div className="mt-4 rounded-xl bg-cyan-50 p-4 text-sm text-cyan-900">
                Uploads open 4 hours before the session and close 24 hours after. Originals retain
                full quality for 2 years. You can change this inside the vault.
              </div>
            )}
            <button
              type="button"
              onClick={createVault}
              disabled={!selectedSession || submitting}
              className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create private vault"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
