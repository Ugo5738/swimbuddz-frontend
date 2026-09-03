import { AlertTriangle, Loader2, type LucideIcon } from "lucide-react";

export function VaultMediaLabels({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {labels.slice(0, 3).map((label) => (
        <span
          key={label}
          className="max-w-full truncate rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-800"
        >
          {label}
        </span>
      ))}
      {labels.length > 3 && (
        <span className="text-[10px] text-slate-500">+{labels.length - 3}</span>
      )}
    </div>
  );
}

export function VaultActionButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: LucideIcon;
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

export function VaultStatus({ value }: { value: string }) {
  const color =
    value === "approved" || value === "cleared" || value === "published" || value === "ready"
      ? "bg-emerald-100 text-emerald-700"
      : value === "rejected" ||
          value === "restricted" ||
          value === "takedown" ||
          value === "failed" ||
          value === "aborted"
        ? "bg-red-100 text-red-700"
        : value === "shortlisted" || value === "uploading"
          ? "bg-amber-100 text-amber-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color}`}>{value}</span>
  );
}

export function VaultLabelEditor({
  selectedCount,
  value,
  saving,
  onChange,
  onCancel,
  onSave,
}: {
  selectedCount: number;
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-medium text-slate-800">
          Labels for {selectedCount} selected file{selectedCount === 1 ? "" : "s"}
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="e.g. freestyle, coaching, member story, Instagram"
            className="mt-2 w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 outline-none focus:border-cyan-500"
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Separate labels with commas. Saving replaces the labels on every selected file.
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Save labels
          </button>
        </div>
      </div>
    </div>
  );
}

export function VaultDeleteDialog({
  selectedCount,
  mode,
  deleting,
  onModeChange,
  onCancel,
  onConfirm,
}: {
  selectedCount: number;
  mode: "vault" | "storage";
  deleting: boolean;
  onModeChange: (mode: "vault" | "storage") => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Delete {selectedCount} selected file{selectedCount === 1 ? "" : "s"}?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Choose whether to hide the files from this vault while retaining their private
              originals, or permanently erase all original, preview and published copies from AWS
              storage.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="radio"
              name="delete-mode"
              checked={mode === "vault"}
              onChange={() => onModeChange("vault")}
            />
            <span>
              <span className="block font-semibold text-slate-900">Remove from vault</span>
              <span className="text-sm text-slate-500">
                Hides the files here but retains private originals in storage for recovery.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <input
              type="radio"
              name="delete-mode"
              checked={mode === "storage"}
              onChange={() => onModeChange("storage")}
            />
            <span>
              <span className="block font-semibold text-red-900">
                Permanently delete from AWS storage
              </span>
              <span className="text-sm text-red-700">
                Irreversible. Deletes originals, previews and any published copies.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deleting
              ? "Deleting…"
              : mode === "storage"
                ? "Delete permanently"
                : "Remove from vault"}
          </button>
        </div>
      </div>
    </div>
  );
}
