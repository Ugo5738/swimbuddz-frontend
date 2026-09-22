"use client";

import { apiGet, apiPost } from "@/lib/api";
import {
  formatBytes,
  MEDIA_COVERAGE_STORY,
  MEDIA_RECORDING_STANDARDS,
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
import { BookOpen, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { VaultUploadQueue, type UploadFile } from "./VaultUploadQueue";
import { VaultUploadConfirmation } from "./VaultUploadConfirmation";
import { VaultFilePicker } from "./VaultFilePicker";

type Props = {
  vault: MediaVault | GuestVault;
  scope: UploadScope;
};

function isGuestVault(vault: MediaVault | GuestVault): vault is GuestVault {
  return "remaining_bytes" in vault;
}

export function VaultUploader({ vault, scope }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nextStepRef = useRef<HTMLDivElement>(null);
  const selectionReceivedRef = useRef(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [consent, setConsent] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [online, setOnline] = useState(true);
  const [choosingFiles, setChoosingFiles] = useState(false);
  const [selectionHelp, setSelectionHelp] = useState(false);
  const [isIPhone, setIsIPhone] = useState(false);
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
    setIsIPhone(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    if (!choosingFiles) return;
    const returnedToPage = () => {
      window.setTimeout(() => {
        if (selectionReceivedRef.current) return;
        setChoosingFiles(false);
        setSelectionHelp(true);
      }, 1200);
    };
    window.addEventListener("focus", returnedToPage, { once: true });
    return () => window.removeEventListener("focus", returnedToPage);
  }, [choosingFiles]);

  const openFilePicker = () => {
    selectionReceivedRef.current = false;
    setSelectionHelp(false);
    setChoosingFiles(true);
    // Let React paint the preparation message before iOS opens Photos.
    window.requestAnimationFrame(() => inputRef.current?.click());
  };

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
      if (file.size === 0) {
        toast.error(
          `${file.name} is not available locally. Download it from Photos/iCloud first, then select it again.`
        );
        continue;
      }
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (
        files.some((entry) => entry.key === key) ||
        accepted.some((entry) => entry.key === key)
      ) {
        continue;
      }
      accepted.push({ key, file, status: "queued", progress: 0 });
    }
    setFiles((current) => {
      const known = new Set(current.map((entry) => entry.key));
      const unique = accepted.filter((entry) => {
        if (known.has(entry.key)) return false;
        known.add(entry.key);
        return true;
      });
      return [...current, ...unique];
    });
    if (accepted.length) {
      toast.success(
        `${accepted.length} file${accepted.length === 1 ? "" : "s"} selected. Confirm consent, then press Start full-quality upload.`
      );
      const largeVideos = accepted.filter(
        (entry) => entry.file.type.startsWith("video/") && entry.file.size >= 500 * 1024 ** 2
      );
      if (isIPhone && largeVideos.length > 2) {
        toast.info(
          "For a more reliable iPhone upload, send two large videos at a time. The originals stay full quality."
        );
      }
      window.setTimeout(
        () => nextStepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    }
  };

  const patchFile = (key: string, patch: Partial<UploadFile>) => {
    setFiles((current) =>
      current.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry))
    );
  };

  const uploadOne = async (entry: UploadFile, batchId: string): Promise<void> => {
    patchFile(entry.key, { status: "fingerprinting", error: undefined });
    let fingerprint: string;
    try {
      fingerprint = await fileFingerprint(entry.file);
    } catch {
      throw new Error(
        "The browser could not read this file. If it came from Photos/iCloud, download or export the original to this device and select it again."
      );
    }
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
    const resumedBytes = resumed.parts.reduce((sum, part) => sum + part.size, 0);
    let completedBytes = resumedBytes;
    patchFile(entry.key, {
      progress: Math.min(99, (completedBytes / entry.file.size) * 100),
    });

    const pending = Array.from({ length: saved.partCount }, (_, index) => index + 1).filter(
      (partNumber) => !completedParts.has(partNumber)
    );

    const startedAt = performance.now();
    let lastUiUpdate = 0;
    for (let offset = 0; offset < pending.length; offset += PART_URL_BATCH) {
      if (!navigator.onLine) {
        throw new Error("You are offline. Reconnect and press Resume uploads.");
      }
      const partNumbers = pending.slice(offset, offset + PART_URL_BATCH);
      const signed = await apiPost<{
        parts: { part_number: number; url: string }[];
      }>(`${itemBase}/parts`, { part_numbers: partNumbers }, { auth });
      // Only the currently active URL batch belongs here. Keeping bytes from
      // earlier batches would double count progress once completedBytes moves on.
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
              const now = performance.now();
              const uploadedBytes = completedBytes + currentBytes;
              if (now - lastUiUpdate >= 250 || uploadedBytes >= entry.file.size) {
                const elapsedSeconds = Math.max(0.25, (now - startedAt) / 1000);
                patchFile(entry.key, {
                  progress: Math.min(99, (uploadedBytes / entry.file.size) * 100),
                  bytesUploaded: uploadedBytes,
                  bytesPerSecond: Math.max(0, (uploadedBytes - resumedBytes) / elapsedSeconds),
                });
                lastUiUpdate = now;
              }
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
    patchFile(entry.key, {
      status: "done",
      progress: 100,
      bytesUploaded: entry.file.size,
    });
  };

  const startUploads = async () => {
    const pendingFiles = files.filter((entry) => entry.status !== "done");
    if (!pendingFiles.length) return;
    if (!consent) {
      toast.error("Confirm the consent and safeguarding statement first");
      return;
    }
    const pendingBytes = pendingFiles.reduce((sum, entry) => sum + entry.file.size, 0);
    if (pendingBytes > remainingBytes) {
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
      const batchSignature = pendingFiles
        .map((entry) => entry.key)
        .sort()
        .join("|");
      const savedBatchRaw = localStorage.getItem(batchStorageKey);
      let savedBatch: { id: string; signature: string } | null = null;
      if (savedBatchRaw?.startsWith("{")) {
        try {
          savedBatch = JSON.parse(savedBatchRaw) as { id: string; signature: string };
        } catch {
          savedBatch = null;
        }
      }
      const batch =
        savedBatch?.signature === batchSignature
          ? { id: savedBatch.id }
          : await mediaVaultApi.createBatch(
              scope.kind === "guest"
                ? { guestToken: scope.guestToken }
                : { vaultId: scope.vaultId },
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
      localStorage.setItem(
        batchStorageKey,
        JSON.stringify({ id: batch.id, signature: batchSignature })
      );
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

      {!isGuestVault(vault) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <span className="font-semibold capitalize">{vault.effective_role ?? "Member"} upload access.</span>{" "}
          {vault.effective_role === "admin" ? (
            <>Admins can upload outside the contributor window.</>
          ) : (
            <>
              Curators and contributors can upload until{" "}
              <strong>{new Date(vault.upload_closes_at).toLocaleString("en-NG")}</strong>. Admin access
              working after this time does not mean the curator window is still open.
            </>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950">The session story</h2>
            <p className="mt-1 text-sm text-slate-600">
              Capture a smaller set of steady, intentional clips that lets someone who was not there
              understand the session.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {MEDIA_COVERAGE_STORY.map((step, index) => (
                <span
                  key={step}
                  className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm"
                >
                  {index + 1}. {step}
                </span>
              ))}
            </div>
            <details className="mt-4 text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold text-blue-800">
                Quick recording standard
              </summary>
              <ul className="mt-3 grid gap-2 pl-5 sm:grid-cols-2">
                {MEDIA_RECORDING_STANDARDS.map((standard) => (
                  <li key={standard} className="list-disc pr-3">
                    {standard}
                  </li>
                ))}
              </ul>
            </details>
            <Link
              href="/guides/session-media-coverage"
              target="_blank"
              className="mt-4 inline-flex text-sm font-semibold text-blue-800 underline decoration-blue-300 underline-offset-4 hover:text-blue-950"
            >
              Open the full shareable media coverage guide
            </Link>
          </div>
        </div>
      </section>

      <VaultFilePicker
        inputRef={inputRef}
        choosing={choosingFiles}
        selectionHelp={selectionHelp}
        maxFileBytes={maxFileBytes}
        remainingBytes={remainingBytes}
        onChoose={openFilePicker}
        onFiles={(incoming) => {
          selectionReceivedRef.current = true;
          setChoosingFiles(false);
          addFiles(incoming);
        }}
        onEmptySelection={() => {
          selectionReceivedRef.current = true;
          setChoosingFiles(false);
          setSelectionHelp(true);
        }}
      />

      {files.length > 0 && (
        <div ref={nextStepRef} className="scroll-mt-4 space-y-4">
          <VaultUploadQueue
            files={files}
            totalBytes={totalBytes}
            completed={completed}
            uploading={uploading}
            onClear={() => setFiles([])}
            onRemove={removeFile}
          />
          <VaultUploadConfirmation
            vault={vault}
            consent={consent}
            notes={notes}
            uploading={uploading}
            online={online}
            hasPending={files.some((entry) => entry.status !== "done")}
            hasFailed={files.some((entry) => entry.status === "failed")}
            onConsentChange={setConsent}
            onNotesChange={setNotes}
            onStart={() => void startUploads()}
          />
        </div>
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

    </div>
  );
}
