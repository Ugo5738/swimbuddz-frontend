"use client";

import { apiGet, apiPost } from "@/lib/api";
import {
  formatBytes,
  mediaVaultApi,
  type GuestVault,
  type MediaVault,
  type MultipartUpload,
} from "@/lib/media-vault";
import {
  fileFingerprint,
  PART_CONCURRENCY,
  PART_URL_BATCH,
  runConcurrent,
  uploadBase,
  uploadPart,
  withRetry,
  type SavedUpload,
  type UploadScope,
} from "@/lib/media-vault-upload";
import { CloudUpload, Loader2, RefreshCcw, ShieldCheck, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { VaultUploadQueue, type UploadFile } from "./VaultUploadQueue";

type Props = {
  vault: MediaVault | GuestVault;
  scope: UploadScope;
};

function isGuestVault(vault: MediaVault | GuestVault): vault is GuestVault {
  return "remaining_bytes" in vault;
}

export function VaultUploader({ vault, scope }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [consent, setConsent] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState(true);
  const maxFileBytes = vault.max_file_bytes;
  const remainingBytes = isGuestVault(vault)
    ? vault.remaining_bytes
    : vault.max_total_bytes - vault.used_bytes;

  const totalBytes = useMemo(() => files.reduce((sum, entry) => sum + entry.file.size, 0), [files]);
  const completed = files.filter((entry) => entry.status === "done").length;
  const checklistItems = vault.shot_checklist;

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    const preventLeave = (event: BeforeUnloadEvent) => {
      if (!uploading) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [uploading]);

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: UploadFile[] = [];
    for (const file of Array.from(incoming)) {
      if (
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/") &&
        !/\.(heic|heif|mov|mp4|m4v|jpg|jpeg|png|webp|tiff?)$/i.test(file.name)
      ) {
        toast.error(`${file.name} is not an image or video`);
        continue;
      }
      if (file.size > maxFileBytes) {
        toast.error(`${file.name} exceeds ${formatBytes(maxFileBytes)}`);
        continue;
      }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (files.some((entry) => entry.key === key)) continue;
      accepted.push({ key, file, status: "queued", progress: 0 });
    }
    setFiles((current) => [...current, ...accepted]);
  };

  const patchFile = (key: string, patch: Partial<UploadFile>) => {
    setFiles((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
    );
  };

  const uploadOne = async (entry: UploadFile, batchId: string): Promise<void> => {
    patchFile(entry.key, { status: "fingerprinting", error: undefined });
    const fingerprint = await fileFingerprint(entry.file);
    const persistenceKey = `swimbuddz-vault-upload:${scope.vaultId}:${fingerprint}`;
    const savedRaw = localStorage.getItem(persistenceKey);
    let saved: SavedUpload | null = savedRaw ? (JSON.parse(savedRaw) as SavedUpload) : null;
    const auth = scope.kind === "member";
    const base = uploadBase(scope, batchId);

    if (!saved || saved.batchId !== batchId) {
      const initiated = await apiPost<MultipartUpload>(
        `${base}/initiate`,
        {
          filename: entry.file.name,
          content_type: entry.file.type || "application/octet-stream",
          size_bytes: entry.file.size,
          captured_at: new Date(entry.file.lastModified).toISOString(),
          client_fingerprint: fingerprint,
        },
        { auth }
      );
      saved = {
        batchId,
        itemId: initiated.media_item_id,
        partSize: initiated.part_size,
        partCount: initiated.part_count,
        fingerprint,
      };
      localStorage.setItem(persistenceKey, JSON.stringify(saved));
      patchFile(entry.key, { duplicate: Boolean(initiated.duplicate_of_id) });
    }

    patchFile(entry.key, { status: "uploading", progress: 0 });
    const itemBase = `${base}/${saved.itemId}`;
    const resumed = await apiGet<{
      parts: { part_number: number; etag: string; size: number }[];
      status: string;
    }>(`${itemBase}/parts`, { auth });
    if (resumed.status === "ready") {
      localStorage.removeItem(persistenceKey);
      patchFile(entry.key, { status: "done", progress: 100 });
      return;
    }
    if (resumed.status !== "uploading") {
      localStorage.removeItem(persistenceKey);
      await uploadOne(entry, batchId);
      return;
    }
    const completedParts = new Map(resumed.parts.map((part) => [part.part_number, part.etag]));
    let completedBytes = resumed.parts.reduce((sum, part) => sum + part.size, 0);
    patchFile(entry.key, {
      progress: Math.min(99, (completedBytes / entry.file.size) * 100),
    });

    const pending = Array.from({ length: saved.partCount }, (_, index) => index + 1).filter(
      (partNumber) => !completedParts.has(partNumber)
    );

    for (let offset = 0; offset < pending.length; offset += PART_URL_BATCH) {
      if (!navigator.onLine) {
        throw new Error("You are offline. Reconnect and press Resume uploads.");
      }
      const partNumbers = pending.slice(offset, offset + PART_URL_BATCH);
      const signed = await apiPost<{
        parts: { part_number: number; url: string }[];
      }>(`${itemBase}/parts`, { part_numbers: partNumbers }, { auth });
      const liveProgress = new Map<number, number>();
      const results = await runConcurrent(
        signed.parts.map((part) => async () => {
          const start = (part.part_number - 1) * saved!.partSize;
          const end = Math.min(start + saved!.partSize, entry.file.size);
          const blob = entry.file.slice(start, end);
          const etag = await withRetry(() =>
            uploadPart(part.url, blob, (loaded) => {
              liveProgress.set(part.part_number, loaded);
              const currentBytes = Array.from(liveProgress.values()).reduce(
                (sum, value) => sum + value,
                0
              );
              patchFile(entry.key, {
                progress: Math.min(99, ((completedBytes + currentBytes) / entry.file.size) * 100),
              });
            })
          );
          return { partNumber: part.part_number, etag, size: blob.size };
        }),
        PART_CONCURRENCY
      );
      for (const result of results) {
        completedParts.set(result.partNumber, result.etag);
        completedBytes += result.size;
      }
    }

    await apiPost(
      `${itemBase}/complete`,
      {
        parts: Array.from(completedParts.entries())
          .sort(([a], [b]) => a - b)
          .map(([part_number, etag]) => ({ part_number, etag })),
      },
      { auth }
    );
    localStorage.removeItem(persistenceKey);
    patchFile(entry.key, { status: "done", progress: 100 });
  };

  const startUploads = async () => {
    const pendingFiles = files.filter((entry) => entry.status !== "done");
    if (!pendingFiles.length) return;
    if (!consent) {
      toast.error("Confirm the consent and safeguarding statement first");
      return;
    }
    if (totalBytes > remainingBytes) {
      toast.error("These files exceed the remaining vault allowance");
      return;
    }
    setUploading(true);
    let wakeLock: { release: () => Promise<void> } | null = null;
    try {
      const navigatorWithWakeLock = navigator as Navigator & {
        wakeLock?: {
          request: (type: "screen") => Promise<{ release: () => Promise<void> }>;
        };
      };
      wakeLock = (await navigatorWithWakeLock.wakeLock?.request("screen")) ?? null;
      const batchStorageKey = `swimbuddz-vault-batch:${scope.vaultId}`;
      const savedBatchId = localStorage.getItem(batchStorageKey);
      const batch = savedBatchId
        ? { id: savedBatchId }
        : await mediaVaultApi.createBatch(
            scope.kind === "guest" ? { guestToken: scope.guestToken } : { vaultId: scope.vaultId },
            {
              expected_files: pendingFiles.length,
              expected_bytes: pendingFiles.reduce((sum, entry) => sum + entry.file.size, 0),
              consent_attested: true,
              consent_attestation_text:
                "I confirm these files were captured for SwimBuddz and I followed the displayed consent and safeguarding notice.",
              checklist_completed: checklist,
              notes: notes || null,
            }
          );
      localStorage.setItem(batchStorageKey, batch.id);
      let failed = false;
      for (const entry of pendingFiles) {
        try {
          await uploadOne(entry, batch.id);
        } catch (error) {
          failed = true;
          patchFile(entry.key, {
            status: "failed",
            error: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }
      if (!failed) localStorage.removeItem(batchStorageKey);
      toast.success("Upload run finished. Failed files can be resumed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start the upload");
    } finally {
      await wakeLock?.release().catch(() => undefined);
      setUploading(false);
    }
  };

  const removeFile = async (entry: UploadFile) => {
    if (entry.status === "uploading") return;
    setFiles((current) => current.filter((item) => item.key !== entry.key));
  };

  return (
    <div className="space-y-6">
      {!online && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <WifiOff className="h-5 w-5" />
          You are offline. Your selected files remain on this device; reconnect before resuming.
        </div>
      )}

      <div
        className="rounded-2xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 p-8 text-center transition hover:border-cyan-500"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <CloudUpload className="mx-auto h-12 w-12 text-cyan-600" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">
          Add full-quality photos and videos
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Large iPhone HEIC, 4K, ProRes and MOV files are uploaded directly to private S3 in
          resumable chunks. Originals are not compressed.
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 rounded-xl bg-cyan-600 px-5 py-2.5 font-semibold text-white hover:bg-cyan-500"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif,.mov"
          className="hidden"
          onChange={(event) => event.target.files && addFiles(event.target.files)}
        />
        <p className="mt-3 text-xs text-slate-500">
          Up to {formatBytes(maxFileBytes)} per file · {formatBytes(Math.max(0, remainingBytes))}{" "}
          remaining
        </p>
      </div>

      {files.length > 0 && (
        <VaultUploadQueue
          files={files}
          totalBytes={totalBytes}
          completed={completed}
          uploading={uploading}
          onClear={() => setFiles([])}
          onRemove={removeFile}
        />
      )}

      {checklistItems.length > 0 && (
        <fieldset className="rounded-2xl border border-slate-200 bg-white p-5">
          <legend className="px-1 font-semibold text-slate-900">Session shot checklist</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {checklistItems.map((item) => (
              <label key={item} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={checklist.includes(item)}
                  onChange={(event) =>
                    setChecklist((current) =>
                      event.target.checked
                        ? [...current, item]
                        : current.filter((value) => value !== item)
                    )
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600"
                />
                <span className="text-slate-700">{item}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Consent and safeguarding confirmation
            </span>
            <span className="mt-1 block text-sm text-slate-600">
              {vault.consent_notice ??
                "I confirm these files were captured for SwimBuddz, respect participant opt-outs, and are appropriate for the social media team to review."}
            </span>
          </span>
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional handoff notes: standout moments, people to avoid, missing shots…"
          className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-cyan-500"
        />
      </div>

      <button
        type="button"
        disabled={!files.some((entry) => entry.status !== "done") || uploading}
        onClick={startUploads}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Keep this page open · uploading
          </>
        ) : files.some((entry) => entry.status === "failed") ? (
          <>
            <RefreshCcw className="h-5 w-5" />
            Resume uploads
          </>
        ) : (
          <>
            <CloudUpload className="h-5 w-5" />
            Start full-quality upload
          </>
        )}
      </button>
    </div>
  );
}
