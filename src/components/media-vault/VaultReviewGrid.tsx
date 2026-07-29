"use client";

import { formatBytes, mediaVaultApi, type VaultMedia } from "@/lib/media-vault";
import {
  Check,
  Download,
  Eye,
  FileArchive,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Send,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = { vaultId: string };

export function VaultReviewGrid({ vaultId }: Props) {
  const [items, setItems] = useState<VaultMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ page_size: "200" });
      if (reviewFilter !== "all") query.set("review_status", reviewFilter);
      if (mediaFilter !== "all") query.set("media_type", mediaFilter);
      if (search.trim()) query.set("search", search.trim());
      const result = await mediaVaultApi.listItems(vaultId, `?${query.toString()}`);
      setItems(result.items);
      setError(null);
      setSelected((current) => {
        const available = new Set(result.items.map((item) => item.id));
        return new Set([...current].filter((id) => available.has(id)));
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load media");
    } finally {
      setLoading(false);
    }
  }, [vaultId, reviewFilter, mediaFilter, search]);

  useEffect(() => {
    const timeout = setTimeout(loadItems, search ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [loadItems, search]);

  const chosen = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);

  const runBulk = async (body: Record<string, unknown>, successMessage: string) => {
    if (!selected.size) return;
    setActing(true);
    try {
      await mediaVaultApi.review(vaultId, [...selected], body);
      toast.success(successMessage);
      await loadItems();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  const generatePreviews = async () => {
    if (!selected.size) return;
    setActing(true);
    try {
      await Promise.all(
        [...selected].map((itemId) => mediaVaultApi.requestPreview(vaultId, itemId))
      );
      toast.success("Review previews queued. Originals remain untouched.");
      setTimeout(loadItems, 3500);
    } catch (previewError) {
      toast.error(
        previewError instanceof Error ? previewError.message : "Could not generate previews"
      );
    } finally {
      setActing(false);
    }
  };

  const downloadSelection = async () => {
    if (!chosen.length) return;
    setActing(true);
    try {
      if (chosen.length === 1) {
        const authorization = await mediaVaultApi.authorizeDownload(vaultId, chosen[0].id);
        const anchor = document.createElement("a");
        anchor.href = authorization.url;
        anchor.download = authorization.filename;
        anchor.rel = "noopener";
        anchor.click();
        toast.success("Full-quality download authorized and recorded");
      } else {
        await mediaVaultApi.createExport(
          vaultId,
          chosen.map((item) => item.id)
        );
        toast.success("Full-quality ZIP export is being prepared");
      }
    } catch (downloadError) {
      toast.error(downloadError instanceof Error ? downloadError.message : "Download failed");
    } finally {
      setActing(false);
    }
  };

  const publishSelection = async () => {
    if (!selected.size) return;
    setActing(true);
    try {
      await mediaVaultApi.publish(vaultId, [...selected]);
      toast.success("Approved originals copied to the gallery album");
      await loadItems();
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "Could not publish");
    } finally {
      setActing(false);
    }
  };

  const buildSocialExport = async () => {
    if (!chosen.length) return;
    setActing(true);
    try {
      await mediaVaultApi.createExport(
        vaultId,
        chosen.map((item) => item.id),
        "social-portrait"
      );
      toast.success("4:5 social derivatives are being prepared");
    } catch (socialError) {
      toast.error(
        socialError instanceof Error ? socialError.message : "Could not build social export"
      );
    } finally {
      setActing(false);
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search filename…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-500"
        />
        <select
          value={reviewFilter}
          onChange={(event) => setReviewFilter(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">All review states</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
        <select
          value={mediaFilter}
          onChange={(event) => setMediaFilter(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all">Photos and videos</option>
          <option value="IMAGE">Photos</option>
          <option value="VIDEO">Videos</option>
        </select>
        <button
          type="button"
          onClick={loadItems}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Refresh media"
        >
          <RefreshCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() =>
            setSelected((current) =>
              current.size === items.length ? new Set() : new Set(items.map((item) => item.id))
            )
          }
          disabled={!items.length}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {selected.size === items.length && items.length ? "Clear" : "Select page"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 p-3 text-white shadow-xl">
          <span className="mr-2 text-sm font-semibold">{selected.size} selected</span>
          <Action label="Preview" icon={Eye} onClick={generatePreviews} disabled={acting} />
          <Action
            label="Shortlist"
            icon={Star}
            onClick={() => runBulk({ review_status: "shortlisted" }, "Items shortlisted")}
            disabled={acting}
          />
          <Action
            label="Approve"
            icon={Check}
            onClick={() => runBulk({ review_status: "approved" }, "Items approved")}
            disabled={acting}
          />
          <Action
            label="Consent clear"
            icon={ShieldCheck}
            onClick={() => runBulk({ consent_status: "cleared" }, "Consent status updated")}
            disabled={acting}
          />
          <Action
            label="Restrict"
            icon={ShieldCheck}
            onClick={() =>
              runBulk({ consent_status: "restricted" }, "Items restricted from publication")
            }
            disabled={acting}
          />
          <Action
            label="5★"
            icon={Star}
            onClick={() => runBulk({ rating: 5 }, "Rating updated")}
            disabled={acting}
          />
          <Action
            label="Reject"
            icon={X}
            onClick={() => runBulk({ review_status: "rejected" }, "Items rejected")}
            disabled={acting}
          />
          <Action
            label={selected.size === 1 ? "Download" : "Build ZIP"}
            icon={selected.size === 1 ? Download : FileArchive}
            onClick={downloadSelection}
            disabled={acting}
          />
          <Action
            label="Social 4:5"
            icon={ImageIcon}
            onClick={buildSocialExport}
            disabled={acting}
          />
          <Action label="Publish" icon={Send} onClick={publishSelection} disabled={acting} />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <ImageIcon className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-3 font-semibold text-slate-900">No files match this view</h3>
          <p className="mt-1 text-sm text-slate-500">
            Uploads appear here after S3 verifies every multipart chunk.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`group relative overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition ${
                selected.has(item.id)
                  ? "border-cyan-500 ring-2 ring-cyan-100"
                  : "border-transparent hover:border-slate-300"
              }`}
            >
              <div className="relative aspect-square bg-slate-100">
                {item.preview_url ? (
                  item.media_type === "VIDEO" ? (
                    <video
                      src={item.preview_url}
                      muted
                      preload="metadata"
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Image
                      src={item.preview_url}
                      alt={item.original_filename ?? "Vault media"}
                      fill
                      sizes="(max-width: 768px) 50vw, 20vw"
                      className="object-cover"
                    />
                  )
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    {item.media_type === "VIDEO" ? (
                      <FileVideo className="h-9 w-9" />
                    ) : (
                      <ImageIcon className="h-9 w-9" />
                    )}
                    <span className="mt-2 text-xs">Preview on request</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-label={
                    selected.has(item.id)
                      ? `Deselect ${item.original_filename}`
                      : `Select ${item.original_filename}`
                  }
                  className={`absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                    selected.has(item.id)
                      ? "border-cyan-500 bg-cyan-500 text-white"
                      : "border-white bg-slate-900/40"
                  }`}
                >
                  {selected.has(item.id) && <Check className="h-4 w-4" />}
                </button>
                {item.duplicate_of_id && (
                  <span className="absolute right-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    DUPLICATE?
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {item.original_filename}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {formatBytes(item.size_bytes ?? 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Status value={item.review_status} />
                  <Status value={item.consent_status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Action({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof Check;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20 disabled:opacity-50"
    >
      {disabled ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}

function Status({ value }: { value: string }) {
  const color =
    value === "approved" || value === "cleared" || value === "published"
      ? "bg-emerald-100 text-emerald-700"
      : value === "rejected" || value === "restricted" || value === "takedown"
        ? "bg-red-100 text-red-700"
        : value === "shortlisted"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>{value}</span>
  );
}
