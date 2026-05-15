// AssetsTab — pool admin media + document asset uploads. Extracted from
// `src/components/admin/PoolEditTabs.tsx` during the file-size sweep.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MediaInput } from "@/components/ui/MediaInput";
import { getMediaUrl } from "@/lib/media";
import { PoolsApi, type PoolAsset, type PoolAssetCreate, type PoolAssetType } from "@/lib/pools";
import { Image as ImageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, inputCls } from "./_shared";

const ASSET_TYPES: PoolAssetType[] = ["photo", "document", "video", "certificate", "other"];

export function AssetsTab({ poolId }: { poolId: string }) {
  const [assets, setAssets] = useState<PoolAsset[] | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      setAssets(await PoolsApi.listAssets(poolId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load assets");
      setAssets([]);
    }
  }, [poolId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this asset?")) return;
    try {
      await PoolsApi.deleteAsset(poolId, id);
      toast.success("Asset removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const setPrimary = async (id: string) => {
    try {
      await PoolsApi.updateAsset(poolId, id, { is_primary: true });
      toast.success("Set as primary");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (assets === null) return <Card className="p-6 text-sm text-slate-500">Loading assets...</Card>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {assets.length} {assets.length === 1 ? "asset" : "assets"}
        </p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Add asset
        </Button>
      </div>

      {showForm && (
        <AssetForm
          poolId={poolId}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {assets.length === 0 && !showForm ? (
        <EmptyState
          icon={ImageIcon}
          label="No assets yet. Add pool photos, signed documents, or certificates."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assets.map((a) => (
            <AssetCard
              key={a.id}
              asset={a}
              onSetPrimary={() => setPrimary(a.id)}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({
  asset,
  onSetPrimary,
  onDelete,
}: {
  asset: PoolAsset;
  onSetPrimary: () => void;
  onDelete: () => void;
}) {
  // Resolve media_id to a real URL. Direct `url` is used as-is.
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(asset.url);

  useEffect(() => {
    let cancelled = false;
    if (asset.media_id && !asset.url) {
      getMediaUrl(asset.media_id)
        .then((u) => {
          if (!cancelled) setResolvedUrl(u);
        })
        .catch(() => {
          if (!cancelled) setResolvedUrl(null);
        });
    } else {
      setResolvedUrl(asset.url);
    }
    return () => {
      cancelled = true;
    };
  }, [asset.media_id, asset.url]);

  const isPhoto = asset.asset_type === "photo" || asset.asset_type === "certificate";
  const isVideo = asset.asset_type === "video";

  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        {isPhoto && resolvedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={asset.title ?? "pool asset"}
            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
          />
        ) : isVideo && resolvedUrl ? (
          <video
            src={resolvedUrl}
            className="w-20 h-20 rounded-lg object-cover border border-slate-200"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center">
            <ImageIcon className="h-6 w-6 text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1 mb-1">
            <Badge variant="default" className="capitalize text-xs">
              {asset.asset_type}
            </Badge>
            {asset.is_primary && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                <Star className="h-3 w-3" />
                Primary
              </span>
            )}
          </div>
          {asset.title && (
            <h4 className="font-semibold text-sm text-slate-900">{asset.title}</h4>
          )}
          {asset.caption && (
            <p className="text-xs text-slate-500 line-clamp-2">{asset.caption}</p>
          )}
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-600 hover:underline"
            >
              Open →
            </a>
          )}
          <div className="flex gap-1 mt-2">
            {!asset.is_primary && (
              <button
                onClick={onSetPrimary}
                className="text-xs text-slate-600 hover:text-amber-600"
              >
                Make primary
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-xs text-rose-600 hover:underline ml-auto"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AssetForm({
  poolId,
  onSaved,
  onCancel,
}: {
  poolId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PoolAssetCreate>({
    asset_type: "photo",
    media_id: null,
    url: "",
    title: "",
    caption: "",
    is_primary: false,
    display_order: 0,
  });
  const [busy, setBusy] = useState(false);

  // `accept` hint for the file picker based on asset type
  const acceptFor = (t: PoolAssetType): string => {
    switch (t) {
      case "photo":
        return "image/*";
      case "video":
        return "video/*";
      case "document":
        return "application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt";
      case "certificate":
        return "image/*,application/pdf";
      default:
        return "";
    }
  };

  // The media_service purpose to use. For videos we use product_video
  // (which allows large files), for everything else "general".
  const purposeFor = (t: PoolAssetType) =>
    t === "video" ? "product_video" : "general";

  const save = async () => {
    if (!form.media_id && !form.url?.trim()) {
      toast.error("Upload a file or paste a URL first");
      return;
    }
    setBusy(true);
    try {
      await PoolsApi.createAsset(poolId, {
        ...form,
        title: form.title || null,
        caption: form.caption || null,
        url: form.url || null,
        media_id: form.media_id || null,
        display_order: form.display_order ?? 0,
      });
      toast.success("Asset added");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 border-cyan-200 bg-cyan-50/30 space-y-3">
      <h4 className="font-semibold text-slate-900">Add asset</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select
            className={inputCls}
            value={form.asset_type}
            onChange={(e) => {
              // Clearing media_id/url when switching type prevents mixing
              // a video file with asset_type=photo, etc.
              setForm({
                ...form,
                asset_type: e.target.value as PoolAssetType,
                media_id: null,
                url: "",
              });
            }}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Display order
          </label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.display_order ?? 0}
            onChange={(e) =>
              setForm({
                ...form,
                display_order: e.target.value === "" ? 0 : Number(e.target.value),
              })
            }
          />
          <p className="mt-1 text-xs text-slate-500">
            Lower numbers appear first in the gallery.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_primary ?? false}
              onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
            />
            Primary asset
          </label>
        </div>

        {/* Media (upload OR URL) */}
        <div className="sm:col-span-2">
          <MediaInput
            purpose={purposeFor(form.asset_type ?? "photo")}
            mode="both"
            accept={acceptFor(form.asset_type ?? "photo")}
            value={form.media_id ?? null}
            label={
              form.asset_type === "video"
                ? "Upload video or paste URL"
                : form.asset_type === "document"
                  ? "Upload document or paste URL"
                  : "Upload file or paste URL"
            }
            onChange={(mediaId, fileUrl) => {
              // When user uploads: media_id is set, url cleared (use media_id).
              // When user registers a URL, media_service returns media_id too
              // (see registerMediaUrl) — so we keep media_id as the source of truth.
              setForm((prev) => ({
                ...prev,
                media_id: mediaId,
                // Keep url only if we don't have a media_id (shouldn't happen normally)
                url: mediaId ? null : fileUrl ?? null,
              }));
            }}
            onError={(err) => {
              if (err) toast.error(err);
            }}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input
            className={inputCls}
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Caption</label>
          <textarea
            rows={2}
            className={inputCls}
            value={form.caption ?? ""}
            onChange={(e) => setForm({ ...form, caption: e.target.value })}
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy}>
          {busy ? "Saving..." : "Add"}
        </Button>
      </div>
    </Card>
  );
}
