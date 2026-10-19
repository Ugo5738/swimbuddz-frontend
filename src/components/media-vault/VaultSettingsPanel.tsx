"use client";

import { mediaVaultApi, type MediaVault } from "@/lib/media-vault";
import { AttendeeAccessAdmin } from "./AttendeeAccessAdmin";
import { Save, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [status, setStatus] = useState(vault.status);
  const [location, setLocation] = useState(vault.location_name ?? "");
  const [opensAt, setOpensAt] = useState(toLocalDateTime(vault.upload_opens_at));
  const [closesAt, setClosesAt] = useState(toLocalDateTime(vault.upload_closes_at));
  const [maxFileGiB, setMaxFileGiB] = useState(vault.max_file_bytes / GIB);
  const [maxTotalGiB, setMaxTotalGiB] = useState(vault.max_total_bytes / GIB);
  const [retentionDays, setRetentionDays] = useState(vault.retention_days);
  const [consentNotice, setConsentNotice] = useState(vault.consent_notice ?? "");
  const [checklist, setChecklist] = useState(vault.shot_checklist.join("\n"));
  const [defaultAudience, setDefaultAudience] = useState(vault.default_session_visibility);
  const [defaultClips, setDefaultClips] = useState(vault.default_allow_member_clips);
  const [defaultDownloads, setDefaultDownloads] = useState(vault.default_allow_member_downloads);
  const [attendeeView, setAttendeeView] = useState(vault.attendee_can_view ?? true);
  const [attendeeContribute, setAttendeeContribute] = useState(vault.attendee_can_contribute ?? true);
  const [applyExisting, setApplyExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const deleteVault = async () => {
    if (deleteConfirmation !== vault.title) return;
    setDeleting(true);
    try {
      await mediaVaultApi.deleteVault(vault.id);
      toast.success("Vault deleted. Stored originals were retained for recovery.");
      router.push("/admin/media-vault");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete vault");
      setDeleting(false);
    }
  };

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
        default_session_visibility: defaultAudience,
        default_allow_member_clips: defaultAudience !== "private" && defaultClips,
        default_allow_member_downloads: defaultAudience !== "private" && defaultDownloads,
        attendee_can_view: attendeeView,
        attendee_can_contribute: attendeeView && attendeeContribute,
        apply_defaults_to_existing: applyExisting,
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
      toast.success(applyExisting ? "Vault defaults and existing videos updated" : "Vault defaults updated for future uploads");
      setApplyExisting(false);
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
        <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50 p-4 sm:col-span-2">
          <h3 className="font-semibold text-slate-900">Member viewing and download defaults</h3>
          <p className="mt-1 text-xs text-slate-600">These defaults apply to future uploads. Existing recordings keep their permissions unless you explicitly update them.</p>
          <label className="mt-4 block text-sm font-medium text-slate-700">Who can watch cleared and approved recordings?
            <select value={defaultAudience} onChange={(e) => setDefaultAudience(e.target.value as typeof defaultAudience)} className={`${INPUT_CLASS} mt-2`}>
              <option value="private">Admins only</option>
              <option value="selected_members">Selected members</option>
              {vault.session_id && <option value="session_participants">Verified session participants</option>}
            </select>
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" disabled={defaultAudience === "private"} checked={defaultAudience !== "private" && defaultClips} onChange={(e) => setDefaultClips(e.target.checked)} /> Allow short clips</label>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" disabled={defaultAudience === "private"} checked={defaultAudience !== "private" && defaultDownloads} onChange={(e) => setDefaultDownloads(e.target.checked)} /> Allow full video downloads (maximum 512 MiB per file)</label>
          <label className="mt-4 flex items-start gap-2 text-sm font-medium text-slate-800"><input type="checkbox" checked={applyExisting} onChange={(e) => setApplyExisting(e.target.checked)} className="mt-1" /> Also update existing recordings in this Vault</label>
          {applyExisting && <p className="mt-2 text-xs text-amber-800">This changes the audience for every existing ready video. Broadening access requires every affected recording to be approved and consent-cleared. Otherwise saving will be rejected. Use the Review tab for individual exceptions.</p>}
        </div>
        {vault.session_id && <div className="mt-5 space-y-3 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <h3 className="font-semibold text-slate-900">Automatic access for verified attendees</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attendeeView} onChange={e=>setAttendeeView(e.target.checked)}/> Allow verified attendees to browse approved session media</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={attendeeView && attendeeContribute} disabled={!attendeeView} onChange={e=>setAttendeeContribute(e.target.checked)}/> Allow verified attendees to contribute recordings</label>
          <p className="text-xs text-slate-600">All uploads still require approval and consent clearance before being shared with attendees.</p>
          <AttendeeAccessAdmin vaultId={vault.id}/>
        </div>}
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
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 xl:col-span-2">
        <h2 className="font-bold text-red-950">Delete vault</h2>
        <p className="mt-2 text-sm text-red-900/80">
          Removes this vault from vault lists and revokes member and guest access. Original files
          stay private in AWS storage for recovery and continue to incur storage costs. Previously
          issued download links may work until they expire, and already published gallery copies
          are unaffected. To permanently remove individual files from AWS, use Delete in the Review
          tab first.
        </p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" /> Delete vault
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <label htmlFor="vault-delete-confirmation" className="block text-sm text-red-950">
              Type <strong>{vault.title}</strong> to confirm deletion.
            </label>
            <input
              id="vault-delete-confirmation"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              autoComplete="off"
              className="w-full max-w-md rounded-lg border border-red-300 bg-white px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void deleteVault()}
                disabled={deleting || deleteConfirmation !== vault.title}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Confirm delete vault"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmation("");
                }}
                disabled={deleting}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
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
