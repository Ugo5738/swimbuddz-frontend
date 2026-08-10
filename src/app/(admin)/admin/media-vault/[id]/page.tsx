"use client";

import { VaultAccessPanel } from "@/components/media-vault/VaultAccessPanel";
import { VaultOperationsPanel } from "@/components/media-vault/VaultOperationsPanel";
import { VaultReviewGrid } from "@/components/media-vault/VaultReviewGrid";
import { VaultSettingsPanel } from "@/components/media-vault/VaultSettingsPanel";
import { VaultUploader } from "@/components/media-vault/VaultUploader";
import { useApi } from "@/hooks/useApi";
import { formatBytes, type MediaVault } from "@/lib/media-vault";
import {
  ArrowLeft,
  CalendarDays,
  Gauge,
  Images,
  LockKeyhole,
  MapPin,
  Settings2,
  Shield,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

type Tab = "review" | "upload" | "access" | "operations" | "settings";

export default function AdminMediaVaultDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("review");
  const { data, loading, error, refetch } = useApi<MediaVault>(
    params.id ? `/api/v1/media/vaults/${params.id}` : null
  );

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
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
    <div className="space-y-6">
      <Link
        href="/admin/media-vault"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Media Vault
      </Link>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold capitalize text-white">
              {data.status}
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Full-quality originals
            </span>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
              No auto-transcoding
            </span>
          </div>
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
            <span>
              {data.item_count} files · {formatBytes(data.used_bytes)}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
          Upload window closes{" "}
          <strong className="text-slate-900">
            {new Date(data.upload_closes_at).toLocaleString("en-NG")}
          </strong>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        <TabButton
          active={tab === "review"}
          onClick={() => setTab("review")}
          icon={Images}
          label={`Review (${data.pending_review_count})`}
        />
        <TabButton
          active={tab === "access"}
          onClick={() => setTab("access")}
          icon={Shield}
          label="Access & links"
        />
        <TabButton
          active={tab === "upload"}
          onClick={() => setTab("upload")}
          icon={UploadCloud}
          label="Upload"
        />
        <TabButton
          active={tab === "operations"}
          onClick={() => setTab("operations")}
          icon={Gauge}
          label="Exports & bandwidth"
        />
        <TabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
          icon={Settings2}
          label="Settings"
        />
      </div>

      {tab === "review" && <VaultReviewGrid vaultId={data.id} />}
      {tab === "upload" && (
        <VaultUploader vault={data} scope={{ kind: "member", vaultId: data.id }} />
      )}
      {tab === "access" && <VaultAccessPanel vault={data} onVaultUpdated={refetch} />}
      {tab === "operations" && <VaultOperationsPanel vaultId={data.id} />}
      {tab === "settings" && <VaultSettingsPanel vault={data} onSaved={refetch} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Images;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
