"use client";

import { useApi } from "@/hooks/useApi";
import {
  formatBytes,
  mediaVaultApi,
  type BandwidthSummary,
  type ExportJob,
} from "@/lib/media-vault";
import { CheckCircle2, Download, FileArchive, Gauge, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function VaultOperationsPanel({ vaultId }: { vaultId: string }) {
  const bandwidth = useApi<BandwidthSummary>("/api/v1/media/vaults/admin/bandwidth");
  const exports = useApi<ExportJob[]>(`/api/v1/media/vaults/${vaultId}/exports`);
  const summary = bandwidth.data;
  const usedPercent = summary
    ? Math.min(
        100,
        (summary.current_month_download_bytes / summary.global_free_allowance_bytes) * 100
      )
    : 0;

  const downloadExport = async (job: ExportJob) => {
    try {
      const authorization = await mediaVaultApi.downloadExport(vaultId, job.id);
      const anchor = document.createElement("a");
      anchor.href = authorization.url;
      anchor.download = authorization.filename;
      anchor.rel = "noopener";
      anchor.click();
      toast.success("Export download authorized and recorded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not download export");
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-950">
          <Gauge className="h-5 w-5 text-cyan-600" />
          Download bandwidth
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Account-wide app ledger across all vaults. AWS Billing remains the final source of truth.
        </p>
        {bandwidth.loading ? (
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-cyan-600" />
        ) : bandwidth.error ? (
          <p className="mt-5 text-sm text-red-600">{bandwidth.error}</p>
        ) : summary ? (
          <>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-950">
                  {formatBytes(summary.current_month_download_bytes)}
                </p>
                <p className="text-sm text-slate-500">authorized this month (conservative)</p>
              </div>
              <p className="text-sm font-semibold text-emerald-700">
                {formatBytes(summary.allowance_remaining_bytes)} vault-ledger headroom
              </p>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${
                  usedPercent > 85 ? "bg-amber-500" : "bg-cyan-500"
                }`}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-100">
              {summary.months.slice(-6).map((month) => (
                <div
                  key={month.month}
                  className="grid grid-cols-3 gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-0"
                >
                  <span className="font-medium text-slate-700">{month.month}</span>
                  <span className="text-right text-slate-500">
                    {formatBytes(month.upload_bytes)} up
                  </span>
                  <span className="text-right text-slate-500">
                    {formatBytes(month.download_authorized_bytes)} authorized
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              {summary.measurement_note}
            </p>
          </>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-950">
          <FileArchive className="h-5 w-5 text-indigo-600" />
          Full-quality exports
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Multi-file selections become ZIPs asynchronously and expire after 24 hours.
        </p>
        {exports.loading ? (
          <Loader2 className="mt-8 h-6 w-6 animate-spin text-indigo-600" />
        ) : !exports.data?.length ? (
          <p className="mt-8 text-center text-sm text-slate-500">
            Select multiple files in Review and choose Build ZIP.
          </p>
        ) : (
          <div className="mt-5 divide-y divide-slate-100">
            {exports.data.map((job) => (
              <div key={job.id} className="flex items-center gap-3 py-3">
                <div className="rounded-lg bg-indigo-50 p-2">
                  {job.status === "ready" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Loader2
                      className={`h-5 w-5 text-indigo-600 ${
                        ["pending", "processing"].includes(job.status) ? "animate-spin" : ""
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium capitalize text-slate-800">
                    {job.media_item_ids.length} originals · {job.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    {job.size_bytes ? formatBytes(job.size_bytes) : "Preparing"} · expires{" "}
                    {new Date(job.expires_at).toLocaleString("en-NG")}
                  </p>
                  {job.error_message && (
                    <p className="mt-1 truncate text-xs text-red-600">{job.error_message}</p>
                  )}
                </div>
                {job.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => downloadExport(job)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    aria-label="Download export"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
