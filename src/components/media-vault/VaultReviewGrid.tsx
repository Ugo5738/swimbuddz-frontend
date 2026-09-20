"use client";

import { formatBytes, mediaVaultApi, type VaultMedia } from "@/lib/media-vault";
import {
  Check,
  Download,
  Eye,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  Send,
  ShieldCheck,
  Star,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  VaultActionButton as Action,
  VaultDeleteDialog,
  VaultLabelEditor,
  VaultMediaLabels,
  VaultStatus as Status,
} from "./VaultMediaDialogs";
import { VaultVideoDialog, VaultVideoThumbnail } from "./VaultVideoDialog";

type Props = { vaultId: string; admin?: boolean };

export function VaultReviewGrid({ vaultId, admin = false }: Props) {
  const [items, setItems] = useState<VaultMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reviewFilter, setReviewFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");
  const [processingFilter, setProcessingFilter] = useState("ready");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState(false);
  const [editingLabels, setEditingLabels] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [deleteMode, setDeleteMode] = useState<"vault" | "storage" | null>(null);
  const [viewingVideoId, setViewingVideoId] = useState<string | null>(null);
  const [playerWorking, setPlayerWorking] = useState(false);
  const [playerError, setPlayerError] = useState(false);

  const loadItems = useCallback(
    async (background = false) => {
      if (!background) setLoading(true);
      try {
        const query = new URLSearchParams({ page_size: "200" });
        if (reviewFilter !== "all") query.set("review_status", reviewFilter);
        if (mediaFilter !== "all") query.set("media_type", mediaFilter);
        if (processingFilter !== "ready") query.set("processing_status", processingFilter);
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
        if (!background) setLoading(false);
      }
    },
    [vaultId, reviewFilter, mediaFilter, processingFilter, search]
  );

  useEffect(() => {
    const timeout = setTimeout(() => void loadItems(), search ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [loadItems, search]);

  useEffect(() => {
    const previewsAreBuilding = items.some(
      (item) => item.preview_status === "pending" || item.preview_status === "processing"
    );
    if (!previewsAreBuilding) return;
    const interval = window.setInterval(() => void loadItems(true), 4000);
    return () => window.clearInterval(interval);
  }, [items, loadItems]);

  const chosen = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);
  const viewingVideo = items.find((item) => item.id === viewingVideoId);
  const selectionReady = chosen.length > 0 && chosen.every((item) => item.processing_status === "ready");

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
      await Promise.all([...selected].map((itemId) => mediaVaultApi.requestPreview(vaultId, itemId)));
      toast.success("Review previews queued. Originals remain untouched.");
      await loadItems(true);
    } catch (previewError) {
      toast.error(previewError instanceof Error ? previewError.message : "Could not generate previews");
    } finally {
      setActing(false);
    }
  };

  const requestVideoPreview = async (itemId: string, force = false) => {
    setPlayerWorking(true);
    try {
      await mediaVaultApi.requestPreview(vaultId, itemId, force);
      setPlayerError(false);
      await loadItems(true);
    } catch (previewError) {
      toast.error(previewError instanceof Error ? previewError.message : "Could not prepare video");
    } finally {
      setPlayerWorking(false);
    }
  };

  const openVideo = (item: VaultMedia) => {
    setViewingVideoId(item.id);
    setPlayerError(false);
    if (!item.preview_url) {
      void requestVideoPreview(item.id);
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

  const openLabelEditor = () => {
    const existing = [...new Set(chosen.flatMap((item) => item.labels ?? []))];
    setLabelInput(existing.join(", "));
    setEditingLabels(true);
  };

  const saveLabels = async () => {
    const labels = labelInput
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
    await runBulk({ labels }, labels.length ? "Media labels updated" : "Media labels cleared");
    setEditingLabels(false);
  };

  const deleteSelection = async () => {
    if (!deleteMode || !selected.size) return;
    const permanent = deleteMode === "storage";
    setActing(true);
    try {
      const result = await mediaVaultApi.deleteItems(vaultId, [...selected], permanent);
      toast.success(
        permanent
          ? `${result.storage_deleted_count} file${result.storage_deleted_count === 1 ? "" : "s"} permanently deleted from the vault and AWS storage`
          : `${result.removed_count} file${result.removed_count === 1 ? "" : "s"} removed from the vault; stored originals were retained`
      );
      setSelected(new Set());
      setDeleteMode(null);
      await loadItems();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Could not delete media");
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
          placeholder="Search filename or label…"
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
        {admin && (
          <select
            value={processingFilter}
            onChange={(event) => setProcessingFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="ready">Ready uploads</option>
            <option value="all">All upload states</option>
            <option value="uploading">Incomplete uploads</option>
            <option value="failed">Failed uploads</option>
            <option value="aborted">Aborted uploads</option>
          </select>
        )}
        <button
          type="button"
          onClick={() => void loadItems()}
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
          <Action
            label="Preview"
            icon={Eye}
            onClick={generatePreviews}
            disabled={acting || !selectionReady}
          />
          <Action label="Labels" icon={Tags} onClick={openLabelEditor} disabled={acting} />
          <Action
            label="Shortlist"
            icon={Star}
            onClick={() => runBulk({ review_status: "shortlisted" }, "Items shortlisted")}
            disabled={acting || !selectionReady}
          />
          <Action
            label="Approve"
            icon={Check}
            onClick={() => runBulk({ review_status: "approved" }, "Items approved")}
            disabled={acting || !selectionReady}
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
            disabled={acting || !selectionReady}
          />
          <Action
            label="Social 4:5"
            icon={ImageIcon}
            onClick={buildSocialExport}
            disabled={acting || !selectionReady}
          />
          <Action
            label="Publish"
            icon={Send}
            onClick={publishSelection}
            disabled={acting || !selectionReady}
          />
          {admin && (
            <Action
              label="Delete"
              icon={Trash2}
              onClick={() => setDeleteMode("vault")}
              disabled={acting}
            />
          )}
        </div>
      )}

      {editingLabels && (
        <VaultLabelEditor
          selectedCount={selected.size}
          value={labelInput}
          saving={acting}
          onChange={setLabelInput}
          onCancel={() => setEditingLabels(false)}
          onSave={() => void saveLabels()}
        />
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
                {item.media_type === "VIDEO" ? (
                  <VaultVideoThumbnail item={item} onWatch={() => openVideo(item)} />
                ) : item.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview_url}
                    alt={item.original_filename ?? "Vault media"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt={item.original_filename ?? "Vault media thumbnail"}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-400">
                    {item.preview_status === "pending" || item.preview_status === "processing" ? (
                      <Loader2 className="h-9 w-9 animate-spin" />
                    ) : (
                      <ImageIcon className="h-9 w-9" />
                    )}
                    <span className="mt-2 px-3 text-center text-xs">
                      {item.preview_status === "failed"
                        ? "Preview unavailable · select Preview to retry"
                        : "Preparing preview…"}
                    </span>
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
                  className={`absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
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
                  {item.processing_status !== "ready" && <Status value={item.processing_status} />}
                  <Status value={item.review_status} />
                  <Status value={item.consent_status} />
                </div>
                <VaultMediaLabels labels={item.labels ?? []} />
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteMode && (
        <VaultDeleteDialog
          selectedCount={selected.size}
          mode={deleteMode}
          deleting={acting}
          onModeChange={setDeleteMode}
          onCancel={() => setDeleteMode(null)}
          onConfirm={() => void deleteSelection()}
        />
      )}
      {viewingVideo && (
        <VaultVideoDialog
          item={viewingVideo}
          working={playerWorking}
          error={playerError}
          onError={() => setPlayerError(true)}
          onRequest={(force) => void requestVideoPreview(viewingVideo.id, force)}
          onClose={() => setViewingVideoId(null)}
        />
      )}
    </div>
  );
}
