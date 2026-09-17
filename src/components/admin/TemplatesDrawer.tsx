// Extracted from `src/app/(admin)/admin/sessions/page.tsx` during the
// file-size sweep. The drawer + its inline form live together because the
// drawer toggles between "list" and "form" views — splitting them across
// files would just mean two imports for one user-visible widget. Both
// components are pure props-driven.

"use client";

import { ClubSessionScopeFields } from "@/components/admin/ClubSessionScopeFields";
import { ClubAccessModeHint } from "@/components/admin/ClubAccessModeHint";
import { PoolPicker } from "@/components/admin/PoolPicker";
import { SessionTemplateVolunteerSlotsSection } from "@/components/admin/SessionTemplateVolunteerSlotsSection";
import { useClubSessionScope } from "@/components/admin/useClubSessionScope";
import {
  VolunteerNeedsDraftSection,
  type VolunteerNeedDraft,
} from "@/components/admin/VolunteerNeedsDraftSection";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Archive, ArchiveRestore, Calendar, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { IBtn } from "@/app/(admin)/admin/sessions/components";
import type { RideArea, RideShareConfigEntry, Template } from "@/app/(admin)/admin/sessions/types";
import { DAY_NAMES, locationLabel } from "@/app/(admin)/admin/sessions/utils";

/**
 * Payload sent to the page's create/update template handlers. Mirrors the
 * form state in TemplateFormInline below — kept here (rather than in
 * sessions/types.ts) because the shape is owned by this widget, not by
 * the persisted Template record.
 */
export type TemplateFormPayload = {
  club_access_mode?: Template["club_access_mode"];
  pricing_settings?: Template["pricing_settings"];
  title: string;
  session_type: string;
  pool_id: string | null;
  location: string | null;
  location_name: string | null;
  club_id: string | null;
  pod_id: string | null;
  day_of_week: number;
  start_time: string;
  duration_minutes: number;
  pool_fee: number;
  capacity: number;
  auto_generate: boolean;
  ride_share_config: RideShareConfigEntry[];
};

function addMinutesToClock(value: string, minutes: number): string {
  const [hours, mins] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return "";
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function TemplatesDrawer({
  templates,
  rideAreas,
  templateForm,
  editingTemplate,
  onClose,
  onCreateTemplate,
  onUpdateTemplate,
  onArchiveTemplate,
  onDeleteTemplate,
  onGenerate,
  onOpenForm,
}: {
  templates: Template[];
  rideAreas: RideArea[];
  templateForm: "create" | "edit" | null;
  editingTemplate: Template | null;
  onClose: () => void;
  onCreateTemplate: (data: TemplateFormPayload, volunteerNeeds: VolunteerNeedDraft[]) => void;
  onUpdateTemplate: (id: string, data: TemplateFormPayload) => void;
  onArchiveTemplate: (id: string, archived: boolean) => void;
  onDeleteTemplate: (id: string) => void;
  onGenerate: (t: Template) => void;
  // `null` mode closes the inline form and returns to the list view.
  onOpenForm: (mode: "create" | "edit" | null, tmpl?: Template) => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleTemplates = templates.filter((template) => showArchived || template.is_active);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="relative z-10 flex w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Session Templates</h2>
          <button onClick={onClose} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {templateForm ? (
            <TemplateFormInline
              mode={templateForm}
              template={editingTemplate}
              rideAreas={rideAreas}
              onCancel={() => onOpenForm(null)}
              onCreate={onCreateTemplate}
              onUpdate={onUpdateTemplate}
            />
          ) : (
            <>
              <Button
                onClick={() => onOpenForm("create")}
                className="mb-4 flex w-full items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" /> New Template
              </Button>

              <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                />
                Show archived templates
              </label>
              <p className="mb-4 text-xs text-slate-500">
                Archiving stops future generation. Existing sessions, bookings, and attendance are
                kept. Restoring does not automatically restart recurrence. Archived templates can be
                permanently deleted only when nothing references them.
              </p>
              {visibleTemplates.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No templates yet. Create one to generate recurring sessions.
                </p>
              ) : (
                <div className="space-y-3">
                  {visibleTemplates.map((t) => (
                    <div key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{t.title}</p>
                          {!t.is_active && (
                            <span className="text-xs font-medium text-amber-700">Archived</span>
                          )}
                          <p className="mt-0.5 text-xs text-slate-500">
                            {DAY_NAMES[t.day_of_week]} at {t.start_time} &middot;{" "}
                            {t.duration_minutes}min
                          </p>
                          <p className="text-xs text-slate-500">
                            {locationLabel(t.location)} &middot;{" "}
                            {t.session_type === "club" ? "Inherited pricing" : `N${t.pool_fee}`}{" "}
                            &middot; {t.capacity} cap
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          title={t.is_active ? "Archive template" : "Restore template"}
                          className="text-slate-500 hover:bg-slate-100"
                          onClick={() => onArchiveTemplate(t.id, t.is_active)}
                        >
                          {t.is_active ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <ArchiveRestore className="h-4 w-4" />
                          )}
                          <span className="ml-1">{t.is_active ? "Archive" : "Restore"}</span>
                        </Button>
                      </div>
                      {t.is_active && (
                        <div className="mt-3 flex gap-2">
                          {t.session_type === "club" &&
                          (t.club_access_mode ?? "plan_included") === "plan_included" ? (
                            <Link
                              href="/admin/club-plans"
                              className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
                            >
                              <Calendar className="h-3.5 w-3.5" /> Generate Club quarter
                            </Link>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => onGenerate(t)}
                              className="flex items-center gap-1"
                            >
                              <Calendar className="h-3.5 w-3.5" /> Generate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenForm("edit", t)}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </div>
                      )}
                      {!t.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 text-red-700"
                          onClick={() => onDeleteTemplate(t.id)}
                        >
                          Delete permanently
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template form (rendered inline within the drawer)
// ---------------------------------------------------------------------------

function TemplateFormInline({
  mode,
  template,
  rideAreas,
  onCancel,
  onCreate,
  onUpdate,
}: {
  mode: "create" | "edit";
  template: Template | null;
  rideAreas: RideArea[];
  onCancel: () => void;
  onCreate: (data: TemplateFormPayload, volunteerNeeds: VolunteerNeedDraft[]) => void;
  onUpdate: (id: string, data: TemplateFormPayload) => void;
}) {
  const [form, setForm] = useState({
    club_access_mode: template?.club_access_mode ?? "plan_included",
    title: template?.title || "",
    session_type: template?.session_type || "club",
    // Prefer pool_id; legacy `location` enum kept for pre-registry templates.
    pool_id: template?.pool_id ?? null,
    location: template?.location || null,
    location_name: template?.location_name ?? null,
    club_id: template?.club_id ?? null,
    pod_id: template?.pod_id ?? null,
    day_of_week: template?.day_of_week ?? 5,
    start_time: template?.start_time || "09:00",
    duration_minutes: template?.duration_minutes || 180,
    pool_fee: template?.pool_fee || 2000,
    capacity: template?.capacity || 20,
    auto_generate: template?.auto_generate || false,
  });
  const [volunteerNeeds, setVolunteerNeeds] = useState<VolunteerNeedDraft[]>([]);
  const [pricing, setPricing] = useState({
    pricing_expected_attendees:
      template?.pricing_settings?.pricing_expected_attendees ?? template?.capacity ?? 20,
    margin_type: template?.pricing_settings?.margin_type ?? "fixed_per_attendee",
    margin_value: template?.pricing_settings?.margin_value ?? 0,
    expected_staff: template?.pricing_settings?.expected_staff ?? 0,
    lanes: template?.pricing_settings?.lanes ?? 1,
    cost_lines: template?.pricing_settings?.cost_lines ?? [],
  });
  const {
    scope: clubScope,
    selectedPod,
    podDefaultPoolName,
    applyDefaultPool,
    handleClubChange,
    handlePodChange,
    handleScopeChange,
    resetScope,
  } = useClubSessionScope({
    sessionType: form.session_type,
    podId: form.pod_id,
    setForm,
  });

  const [rideConfigs, setRideConfigs] = useState<RideShareConfigEntry[]>(
    template?.ride_share_config && Array.isArray(template.ride_share_config)
      ? template.ride_share_config.map((c) => ({
          ride_area_id: c.ride_area_id || "",
          cost: c.cost || 0,
          capacity: c.capacity || 4,
        }))
      : []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.session_type === "club" && pricing.pricing_expected_attendees > form.capacity) {
      alert("Expected attendees cannot exceed template capacity.");
      return;
    }
    if (form.session_type === "club" && !form.club_id) {
      alert("Pick the Club and location this template belongs to.");
      return;
    }
    if (form.session_type === "club" && clubScope === "pod" && !form.pod_id) {
      alert("Pick the pod this Club template is for.");
      return;
    }
    const data: TemplateFormPayload = {
      ...form,
      club_access_mode: form.session_type === "club" ? form.club_access_mode : "plan_included",
      pricing_settings: form.session_type === "club" && form.club_id ? pricing : null,
      club_id: form.session_type === "club" ? form.club_id : null,
      pod_id: form.session_type === "club" && clubScope === "pod" ? (form.pod_id ?? null) : null,
      ride_share_config: rideConfigs
        .filter((c) => c.ride_area_id)
        .map((c) => ({
          ride_area_id: c.ride_area_id,
          // cost/capacity arrive as `number` from the inputs (we store them
          // numerically in state). Number(...) guards against any stray
          // non-numeric value rather than the old `parseFloat(x as any)`.
          cost: Number(c.cost) || 0,
          capacity: Number(c.capacity) || 4,
        })),
    };
    if (mode === "edit" && template) {
      onUpdate(template.id, data);
    } else {
      onCreate(data, volunteerNeeds);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-slate-900">
        {mode === "create" ? "New Template" : "Edit Template"}
      </h3>
      <Input
        label="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
      />
      <Select
        label="Session Type"
        value={form.session_type}
        onChange={(e) => {
          const sessionType = e.target.value;
          if (sessionType !== "club") {
            resetScope();
          }
          setForm({
            ...form,
            session_type: sessionType,
            club_id: sessionType === "club" ? form.club_id : null,
            pod_id: sessionType === "club" ? form.pod_id : null,
          });
        }}
      >
        <option value="club">Club</option>
        <option value="cohort_class">Academy / Cohort Class</option>
        <option value="community">Community</option>
        <option value="event">Event</option>
      </Select>
      {form.session_type === "club" && (
        <>
          <ClubSessionScopeFields
            clubId={form.club_id}
            scope={clubScope}
            podId={form.pod_id}
            onClubChange={handleClubChange}
            onScopeChange={handleScopeChange}
            onPodChange={handlePodChange}
          />
          <Select
            label="Club access mode"
            value={form.club_access_mode}
            onChange={(e) =>
              setForm({
                ...form,
                club_access_mode: e.target.value as NonNullable<Template["club_access_mode"]>,
              })
            }
          >
            <option value="plan_included">Quarter schedule — included for prepaid members</option>
            <option value="active_club">Extra practice — free for prepaid members</option>
            <option value="paid_addon">Separate paid swim — all Club members pay</option>
          </Select>
          <ClubAccessModeHint mode={form.club_access_mode} />
        </>
      )}
      <Select
        label="Day of Week"
        value={form.day_of_week.toString()}
        onChange={(e) => setForm({ ...form, day_of_week: parseInt(e.target.value) })}
      >
        {DAY_NAMES.map((d, i) => (
          <option key={i} value={i}>
            {d}
          </option>
        ))}
      </Select>
      <Input
        label="Start Time"
        type="time"
        value={form.start_time}
        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
        required
      />
      <PoolPicker
        label="Pool"
        value={form.pool_id}
        onChange={(poolId, poolName) =>
          setForm({
            ...form,
            pool_id: poolId,
            location_name: poolName ?? null,
          })
        }
        hint={
          form.session_type === "club"
            ? "Prefilled from the selected Club or Pod. You can override it for this template."
            : "Templates inherit the pool for every session they generate."
        }
      />
      {selectedPod?.default_pool_id && form.pool_id !== selectedPod.default_pool_id && (
        <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p>
            This Pod normally swims at {podDefaultPoolName ?? "its default pool"}. You can keep this
            template pool or restore the Pod default.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => applyDefaultPool(selectedPod.default_pool_id!)}
          >
            Use Pod default
          </Button>
        </div>
      )}
      <Input
        label="Duration (minutes)"
        type="number"
        value={form.duration_minutes}
        onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Pool Fee (N)"
          disabled={form.session_type === "club"}
          type="number"
          value={form.pool_fee}
          onChange={(e) => setForm({ ...form, pool_fee: parseInt(e.target.value) || 0 })}
        />
        <Input
          label="Capacity"
          type="number"
          value={form.capacity}
          onChange={(e) => {
            const capacity = parseInt(e.target.value) || 0;
            if (
              pricing.pricing_expected_attendees === form.capacity ||
              pricing.pricing_expected_attendees > capacity
            ) {
              setPricing({ ...pricing, pricing_expected_attendees: Math.max(capacity, 1) });
            }
            setForm({ ...form, capacity });
          }}
        />
      </div>

      {form.session_type === "club" && form.club_id && (
        <fieldset className="space-y-3 rounded border p-3">
          <legend>Inherited Session pricing</legend>
          <p className="text-sm">
            Each generated date gets current pool and operating rates, including configured
            refreshments. The normal Session cost-plus engine applies this margin; the old Pool Fee
            is not copied.
          </p>
          <Input
            label="Expected attendees"
            type="number"
            min={1}
            required
            value={pricing.pricing_expected_attendees}
            max={form.capacity}
            onChange={(e) =>
              setPricing({ ...pricing, pricing_expected_attendees: Number(e.target.value) })
            }
          />
          <Select
            label="Margin basis"
            value={pricing.margin_type}
            onChange={(e) =>
              setPricing({ ...pricing, margin_type: e.target.value as typeof pricing.margin_type })
            }
          >
            <option value="fixed_per_attendee">Fixed ₦ per attendee</option>
            <option value="percentage">Percentage</option>
          </Select>
          <Input
            label="Margin value (₦ or %)"
            type="number"
            min={0}
            step="0.01"
            required
            value={pricing.margin_value}
            onChange={(e) => setPricing({ ...pricing, margin_value: Number(e.target.value) })}
          />
          <Input
            label="Expected staff"
            type="number"
            min={0}
            max={50}
            required
            value={pricing.expected_staff}
            onChange={(e) => setPricing({ ...pricing, expected_staff: Number(e.target.value) })}
          />
          <Input
            label="Lanes"
            type="number"
            min={1}
            max={50}
            required
            value={pricing.lanes}
            onChange={(e) => setPricing({ ...pricing, lanes: Number(e.target.value) })}
          />
          <p className="text-sm">
            Existing template-specific ancillary cost lines are preserved. Review each generated
            Session’s detailed costs before publication.
          </p>
        </fieldset>
      )}
      {/* Ride share config */}
      <div className="border-t border-slate-200 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Ride Share (optional)</span>
          <button
            type="button"
            onClick={() =>
              setRideConfigs((p) => [...p, { ride_area_id: "", cost: 1000, capacity: 4 }])
            }
            className="text-sm text-cyan-600 hover:text-cyan-800"
          >
            + Add
          </button>
        </div>
        {rideConfigs.map((cfg, i) => (
          <div key={i} className="mb-2 rounded border border-slate-200 bg-white p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Area {i + 1}</span>
              <button
                type="button"
                onClick={() => setRideConfigs((p) => p.filter((_, idx) => idx !== i))}
                className="text-xs text-red-600"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Select
                label="Area"
                value={cfg.ride_area_id}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, ride_area_id: e.target.value };
                  setRideConfigs(next);
                }}
              >
                <option value="">--</option>
                {rideAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Cost"
                type="number"
                value={cfg.cost}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, cost: parseFloat(e.target.value) };
                  setRideConfigs(next);
                }}
              />
              <Input
                label="Seats"
                type="number"
                value={cfg.capacity}
                onChange={(e) => {
                  const next = [...rideConfigs];
                  next[i] = { ...cfg, capacity: parseInt(e.target.value) };
                  setRideConfigs(next);
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {mode === "create" && (
        <VolunteerNeedsDraftSection
          needs={volunteerNeeds}
          onChange={setVolunteerNeeds}
          defaultStartTime={form.start_time}
          defaultEndTime={addMinutesToClock(form.start_time, form.duration_minutes)}
          description="Add the roles every generated session should open. They will be saved with the template, so you do not need to create the template and reopen it first."
        />
      )}

      {/* Saved-template editor updates persisted recurring needs immediately. */}
      {mode === "edit" && template && (
        <SessionTemplateVolunteerSlotsSection
          sessionTemplateId={template.id}
          defaultStartTime={form.start_time}
          defaultEndTime={addMinutesToClock(form.start_time, form.duration_minutes)}
        />
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {mode === "create" ? "Create Template" : "Update Template"}
        </Button>
      </div>
    </form>
  );
}
