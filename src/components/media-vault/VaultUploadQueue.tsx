import { formatBytes } from "@/lib/media-vault";
import { CheckCircle2, FileVideo, Image as ImageIcon, Loader2, X } from "lucide-react";

export type UploadFile = {
  key: string;
  file: File;
  status: "queued" | "fingerprinting" | "uploading" | "done" | "failed";
  progress: number;
  error?: string;
  duplicate?: boolean;
};

type Props = {
  files: UploadFile[];
  totalBytes: number;
  completed: number;
  uploading: boolean;
  onClear: () => void;
  onRemove: (entry: UploadFile) => void;
};

export function VaultUploadQueue({
  files,
  totalBytes,
  completed,
  uploading,
  onClear,
  onRemove,
}: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="font-semibold text-slate-900">
            {files.length} file{files.length === 1 ? "" : "s"}
          </h3>
          <p className="text-sm text-slate-500">
            {formatBytes(totalBytes)} · {completed} complete
          </p>
        </div>
        {!uploading && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-medium text-slate-500 hover:text-red-600"
          >
            Clear
          </button>
        )}
      </div>
      <div className="max-h-[430px] divide-y divide-slate-100 overflow-y-auto">
        {files.map((entry) => (
          <div key={entry.key} className="flex items-center gap-3 px-5 py-4">
            <div className="rounded-lg bg-slate-100 p-2">
              {entry.file.type.startsWith("video/") ? (
                <FileVideo className="h-5 w-5 text-indigo-600" />
              ) : (
                <ImageIcon className="h-5 w-5 text-cyan-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-slate-800">{entry.file.name}</p>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatBytes(entry.file.size)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    entry.status === "failed" ? "bg-red-500" : "bg-cyan-500"
                  }`}
                  style={{ width: `${entry.progress}%` }}
                />
              </div>
              <p
                className={`mt-1 text-xs ${
                  entry.status === "failed" ? "text-red-600" : "text-slate-500"
                }`}
              >
                {entry.error ??
                  (entry.status === "done"
                    ? "Complete"
                    : entry.status === "uploading"
                      ? `${entry.progress.toFixed(0)}% uploaded`
                      : entry.status === "fingerprinting"
                        ? "Checking for possible duplicates…"
                        : "Ready")}
                {entry.duplicate && " · Possible duplicate"}
              </p>
            </div>
            {entry.status === "done" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : entry.status === "uploading" || entry.status === "fingerprinting" ? (
              <Loader2 className="h-5 w-5 animate-spin text-cyan-600" />
            ) : (
              <button
                type="button"
                onClick={() => onRemove(entry)}
                aria-label={`Remove ${entry.file.name}`}
              >
                <X className="h-5 w-5 text-slate-400 hover:text-red-600" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
