"use client";

import { VaultUploader } from "@/components/media-vault/VaultUploader";
import { useApi } from "@/hooks/useApi";
import { type GuestVault } from "@/lib/media-vault";
import { CalendarDays, LockKeyhole, MapPin, Waves } from "lucide-react";
import { useParams } from "next/navigation";

export default function GuestMediaVaultUploadPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { data, loading, error } = useApi<GuestVault>(
    token ? `/api/v1/media/vaults/guest/${token}` : null,
    { auth: false }
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Upload link unavailable</h1>
          <p className="mt-2 text-slate-600">
            {error ?? "This link may have expired or been revoked."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="rounded-xl bg-cyan-600 p-2.5">
            <Waves className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cyan-700">SwimBuddz</p>
            <p className="text-xs text-slate-500">Private, encrypted media handoff</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-7">
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
            {data.link_label}
          </span>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{data.title}</h1>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {new Date(`${data.capture_date}T12:00:00`).toLocaleDateString("en-NG", {
                dateStyle: "full",
              })}
            </span>
            {data.location_name && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {data.location_name}
              </span>
            )}
          </div>
        </div>
        <VaultUploader
          vault={data}
          scope={{
            kind: "guest",
            guestToken: token,
            vaultId: data.vault_id,
          }}
        />
      </div>
    </main>
  );
}
