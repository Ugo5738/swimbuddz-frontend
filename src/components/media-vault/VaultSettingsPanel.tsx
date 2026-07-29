"use client";

import { mediaVaultApi, type MediaVault } from "@/lib/media-vault";
import { Save, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

const GIB = 1024 ** 3;
const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500";

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function VaultSettingsPanel({ vault, onSaved }: { vault: MediaVault; onSaved: () => void }) {
  const [status, setStatus] = useState(vault.status);
  const [location, setLocation] = useState(vault.location_name ?? "");
  const [opensAt, setOpensAt] = useState(toLocalDateTime(vault.upload_opens_at));
  const [closesAt, setClosesAt] = useState(toLocalDateTime(vault.upload_closes_at));
  const [maxFileGiB, setMaxFileGiB] = useState(vault.max_file_bytes / GIB);
  const [maxTotalGiB, setMaxTotalGiB] = useState(vault.max_total_bytes / GIB);
  const [retentionDays, setRetentionDays] = useState(vault.retention_days);
  const [consentNotice, setConsentNotice] = useState(vault.consent_notice ?? "");
  const [checklist, setChecklist] = useState(vault.shot_checklist.join("\n"));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (
      !Number.isFinite(maxFileGiB) ||
      !Number.isFinite(maxTotalGiB) ||
      !Number.isFinite(retentionDays) ||
      maxFileGiB <= 0 ||
      maxTotalGiB <= 0 ||
      retentionDays <= 0
    ) {
      toast.error("Storage limits and retention must be positive numbers");
      return;
    }
    if (new Date(closesAt) <= new Date(opensAt)) {
      toast.error("Upload closing time must be after opening time");
      return;
    }
    if (maxTotalGiB < maxFileGiB) {
      toast.error("Vault allowance must be at least the per-file limit");
      return;
    }
    setSaving(true);
    try {
      await mediaVaultApi.update(vault.id, {
        status,
        location_name: location.trim() || null,
        upload_opens_at: new Date(opensAt).toISOString(),
        upload_closes_at: new Date(closesAt).toISOString(),
        max_file_bytes: Math.round(maxFileGiB * GIB),
        max_total_bytes: Math.round(maxTotalGiB * GIB),
        retention_days: retentionDays,
        consent_notice: consentNotice.trim() || null,
        shot_checklist: checklist
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      toast.success("Vault settings saved");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-950">Vault settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Control the upload window, limits, retention and handoff checklist.
        </p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Workflow status">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as MediaVault["status"])}
              className={INPUT_CLASS}
            >
              <option value="scheduled">Scheduled</option>
              <option value="open">Open</option>
              <option value="review">Review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Uploads open">
            <input
              type="datetime-local"
              value={opensAt}
              onChange={(event) => setOpensAt(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Uploads close">
            <input
              type="datetime-local"
              value={closesAt}
              onChange={(event) => setClosesAt(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Maximum per file (GiB)">
            <input
              type="number"
              min={1}
              max={5120}
              step={1}
              value={maxFileGiB}
              onChange={(event) => setMaxFileGiB(Number(event.target.value))}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Vault allowance (GiB)">
            <input
              type="number"
              min={1}
              step={1}
              value={maxTotalGiB}
              onChange={(event) => setMaxTotalGiB(Number(event.target.value))}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Original retention (days)">
            <input
              type="number"
              min={1}
              max={3650}
              value={retentionDays}
              onChange={(event) => setRetentionDays(Number(event.target.value))}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
        <Field label="Consent and safeguarding notice" wide>
          <textarea
            value={consentNotice}
            onChange={(event) => setConsentNotice(event.target.value)}
            className={`${INPUT_CLASS} min-h-24`}
          />
        </Field>
        <Field label="Shot checklist — one item per line" wide>
          <textarea
            value={checklist}
            onChange={(event) => setChecklist(event.target.value)}
            className={`${INPUT_CLASS} min-h-36`}
          />
        </Field>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save settings"}
        </button>
      </section>

      <aside className="h-fit rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <ShieldCheck className="h-7 w-7 text-emerald-700" />
        <h2 className="mt-4 font-bold text-emerald-950">Original-quality policy</h2>
        <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
          Original files are never transcoded automatically. Review previews and social crops are
          separate, opt-in derivatives and can expire without affecting the originals.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`${wide ? "mt-5 block" : "block"} text-sm font-medium text-slate-700`}>
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}
