"use client";

import { VaultReviewGrid } from "@/components/media-vault/VaultReviewGrid";
import { VaultUploader } from "@/components/media-vault/VaultUploader";
import { useApi } from "@/hooks/useApi";
import { type MediaVault } from "@/lib/media-vault";
import { ArrowLeft, CalendarDays, LockKeyhole, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function MemberMediaVaultDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, loading, error } = useApi<MediaVault>(
    params.id ? `/api/v1/media/vaults/${params.id}` : null
  );

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <LockKeyhole className="mx-auto h-9 w-9 text-red-500" />
        <p className="mt-3 font-medium text-red-800">{error ?? "Vault not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/account/media-vault"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Media assignments
      </Link>
      <div className="mb-7 mt-5">
        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase text-cyan-800">
          {data.effective_role}
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
      {data.effective_role === "curator" || data.effective_role === "admin" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
            You are the social curator for this session. Request lightweight previews, review
            consent, download originals or build a ZIP, then publish only the cleared selection.
          </div>
          <VaultReviewGrid vaultId={data.id} />
        </div>
      ) : (
        <VaultUploader vault={data} scope={{ kind: "member", vaultId: data.id }} />
      )}
    </div>
  );
}
