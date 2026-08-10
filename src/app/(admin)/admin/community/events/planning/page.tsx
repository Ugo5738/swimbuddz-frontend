"use client";

import { PoolPicker } from "@/components/admin/PoolPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingPage } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from "@/lib/api";
import {
  CalendarImportPreview,
  EMPTY_EVENT_TEMPLATE,
  EventFrequency,
  EventOccurrence,
  EventTemplate,
  EventTemplateForm,
} from "@/lib/eventPlanning";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type PlanningTab = "templates" | "import";
type MonthlyRule = "weekday" | "date";
type DateRange = { from_date: string; to_date: string };
type ReminderProfile = "none" | "standard" | "online_talk" | "major_event";

const REMINDER_PROFILES: Record<ReminderProfile, number[]> = {
  none: [],
  standard: [72, 24],
  online_talk: [168, 24, 1],
  major_event: [336, 168, 24],
};

function reminderProfile(hours: number[]): ReminderProfile {
  const key = [...hours].sort((a, b) => b - a).join(",");
  return (
    (Object.entries(REMINDER_PROFILES).find(
      ([, values]) => [...values].sort((a, b) => b - a).join(",") === key
    )?.[0] as ReminderProfile | undefined) ?? "none"
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function templateToForm(template: EventTemplate): EventTemplateForm {
  return {
    ...template,
    description: template.description ?? "",
    location_area: template.location_area ?? "",
    location: template.location ?? "",
    local_start_time: template.local_start_time.slice(0, 5),
    ends_on: template.ends_on ?? "",
    max_capacity: template.max_capacity ? String(template.max_capacity) : "",
    cost_naira: template.cost_naira ? String(template.cost_naira) : "",
    pricing_expected_attendees: template.pricing_expected_attendees
      ? String(template.pricing_expected_attendees)
      : "",
    margin_value: String(template.margin_value ?? 0),
  };
}

function describeRule(template: EventTemplate): string {
  const every = template.interval > 1 ? `Every ${template.interval} ` : "Every ";
  if (template.frequency === "weekly") {
    return `${every}${template.interval > 1 ? "weeks" : "week"} on ${DAYS[template.day_of_week ?? 0]}`;
  }
  if (template.frequency === "annual") {
    return `Every year on ${MONTHS[(template.month_of_year ?? 1) - 1]} ${template.day_of_month ?? template.starts_on.slice(8, 10)}`;
  }
  const unit = template.frequency === "quarterly" ? "quarter" : "month";
  if (template.week_of_month && template.day_of_week !== null) {
    const occurrence = template.week_of_month === -1 ? "last" : `${template.week_of_month}`;
    return `${every}${template.interval > 1 ? `${unit}s` : unit}, ${occurrence} ${DAYS[template.day_of_week]}`;
  }
  return `${every}${template.interval > 1 ? `${unit}s` : unit} on day ${template.day_of_month ?? template.starts_on.slice(8, 10)}`;
}

export default function EventPlanningPage() {
  const [tab, setTab] = useState<PlanningTab>("templates");
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventTemplateForm>(EMPTY_EVENT_TEMPLATE);
  const [monthlyRule, setMonthlyRule] = useState<MonthlyRule>("weekday");
  const [saving, setSaving] = useState(false);
  const [ranges, setRanges] = useState<Record<string, DateRange>>({});
  const [previews, setPreviews] = useState<Record<string, EventOccurrence[]>>({});
  const [workingTemplateId, setWorkingTemplateId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<CalendarImportPreview | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number;
    skipped_existing: number;
  } | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const rows = await apiGet<EventTemplate[]>(
        "/api/v1/events/planning/templates?active_only=false",
        { auth: true }
      );
      setTemplates(rows);
      const year = new Date().getFullYear();
      setRanges((current) => {
        const next = { ...current };
        rows.forEach((template) => {
          next[template.id] ??= {
            from_date: `${year}-01-01`,
            to_date: `${year}-12-31`,
          };
        });
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Event templates could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_EVENT_TEMPLATE, starts_on: `${new Date().getFullYear()}-01-01` });
    setMonthlyRule("weekday");
    setShowEditor(true);
  };

  const openEdit = (template: EventTemplate) => {
    setEditingId(template.id);
    setForm(templateToForm(template));
    setMonthlyRule(template.week_of_month !== null ? "weekday" : "date");
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingId(null);
    setForm(EMPTY_EVENT_TEMPLATE);
  };

  const buildTemplatePayload = () => {
    const payload = {
      ...form,
      description: form.description || null,
      location_area: form.location_area || null,
      location: form.location || null,
      max_capacity: form.max_capacity ? Number(form.max_capacity) : null,
      cost_naira: form.cost_naira ? Number(form.cost_naira) : null,
      pricing_expected_attendees: form.pricing_expected_attendees
        ? Number(form.pricing_expected_attendees)
        : form.max_capacity
          ? Number(form.max_capacity)
          : null,
      margin_value: Number(form.margin_value) || 0,
      ends_on: form.ends_on || null,
      day_of_week: form.day_of_week,
      week_of_month: form.week_of_month,
      day_of_month: form.day_of_month,
      month_of_year: form.month_of_year,
    };
    if (form.visibility === "invite_only") payload.tier_access = "invite_only";
    if (form.frequency === "weekly") {
      payload.day_of_week ??= 0;
      payload.week_of_month = null;
      payload.day_of_month = null;
      payload.month_of_year = null;
    } else if (form.frequency === "monthly" || form.frequency === "quarterly") {
      payload.month_of_year = null;
      if (monthlyRule === "weekday") {
        payload.week_of_month ??= 1;
        payload.day_of_week ??= 0;
        payload.day_of_month = null;
      } else {
        payload.day_of_month ??= 1;
        payload.day_of_week = null;
        payload.week_of_month = null;
      }
    } else {
      const startsOn = form.starts_on ? new Date(`${form.starts_on}T00:00:00`) : null;
      payload.month_of_year ??= startsOn ? startsOn.getMonth() + 1 : 1;
      payload.day_of_month ??= startsOn ? startsOn.getDate() : 1;
      payload.day_of_week = null;
      payload.week_of_month = null;
    }
    return payload;
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = buildTemplatePayload();
      if (editingId) {
        await apiPatch(`/api/v1/events/planning/templates/${editingId}`, payload, { auth: true });
      } else {
        await apiPost("/api/v1/events/planning/templates", payload, { auth: true });
      }
      toast.success(editingId ? "Template updated" : "Template created");
      closeEditor();
      await fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (template: EventTemplate) => {
    if (!confirm(`Delete the recurring template “${template.title}”? Generated events remain.`))
      return;
    try {
      await apiDelete(`/api/v1/events/planning/templates/${template.id}`, { auth: true });
      toast.success("Template deleted");
      await fetchTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template could not be deleted");
    }
  };

  const previewDates = async (templateId: string) => {
    const range = ranges[templateId];
    if (!range?.from_date || !range.to_date) return;
    setWorkingTemplateId(templateId);
    try {
      const rows = await apiPost<EventOccurrence[]>(
        `/api/v1/events/planning/templates/${templateId}/preview`,
        range,
        { auth: true }
      );
      setPreviews((current) => ({ ...current, [templateId]: rows }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dates could not be previewed");
    } finally {
      setWorkingTemplateId(null);
    }
  };

  const generateDrafts = async (templateId: string) => {
    const range = ranges[templateId];
    if (!range?.from_date || !range.to_date) return;
    setWorkingTemplateId(templateId);
    try {
      const result = await apiPost<{ created: number; skipped_existing: number }>(
        `/api/v1/events/planning/templates/${templateId}/generate`,
        range,
        { auth: true }
      );
      toast.success(
        `${result.created} draft${result.created === 1 ? "" : "s"} created${result.skipped_existing ? `; ${result.skipped_existing} already existed` : ""}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Drafts could not be generated");
    } finally {
      setWorkingTemplateId(null);
    }
  };

  const handleWorkbook = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setImportResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const preview = await apiUpload<CalendarImportPreview>(
        "/api/v1/events/planning/imports/xlsx/preview",
        body,
        { auth: true }
      );
      setImportPreview(preview);
      setSelectedRows(
        new Set(
          preview.rows
            .filter((row) => row.selected && row.event && row.errors.length === 0)
            .map((row) => row.source_row)
        )
      );
      toast.success(`${preview.valid_count} calendar rows are ready for review`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workbook could not be read");
    } finally {
      setUploading(false);
    }
  };

  const selectedEvents = useMemo(
    () =>
      importPreview?.rows
        .filter((row) => selectedRows.has(row.source_row) && row.event && !row.errors.length)
        .map((row) => row.event!) ?? [],
    [importPreview, selectedRows]
  );

  const commitImport = async () => {
    if (!selectedEvents.length) return;
    setImporting(true);
    try {
      const result = await apiPost<{ created: number; skipped_existing: number }>(
        "/api/v1/events/planning/imports/commit",
        { rows: selectedEvents },
        { auth: true }
      );
      setImportResult(result);
      toast.success(`${result.created} calendar drafts created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Calendar rows could not be imported");
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <LoadingPage text="Loading event planning..." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/community/events"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-700 hover:text-cyan-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Events and Calendar
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Calendar planning</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Generate recurring activities or preview a controlled Excel import. Both workflows
            create drafts for final venue, pricing, capacity, and visibility review.
          </p>
        </div>
        {tab === "templates" && !showEditor ? (
          <Button onClick={openCreate} className="w-fit gap-2">
            <Plus className="h-4 w-4" />
            New recurring template
          </Button>
        ) : null}
      </header>

      <div className="flex border-b border-slate-200" role="tablist" aria-label="Calendar planning">
        {(
          [
            ["templates", "Recurring templates"],
            ["import", "Excel import"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === value
                ? "border-cyan-600 text-cyan-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <div className="space-y-5">
          {showEditor ? (
            <form onSubmit={saveTemplate} className="space-y-5 border-y border-slate-200 py-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">
                  {editingId ? "Edit recurring template" : "Create recurring template"}
                </h2>
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  aria-label="Close template form"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Template title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  required
                />
                <Select
                  label="Activity type"
                  value={form.event_type}
                  onChange={(event) => setForm({ ...form, event_type: event.target.value })}
                >
                  <option value="online_talk">Online Talk</option>
                  <option value="assessment">Assessment</option>
                  <option value="open_swim">Open swim</option>
                  <option value="quarter_meet">Quarter meet / Buddz Cup</option>
                  <option value="social">Social</option>
                  <option value="excursion">Excursion</option>
                  <option value="town_hall">Town hall</option>
                </Select>
              </div>

              <Textarea
                label="Description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Audience lane"
                  value={form.audience}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      audience: event.target.value as EventTemplateForm["audience"],
                    })
                  }
                >
                  <option value="community">Community</option>
                  <option value="club">Club</option>
                  <option value="academy">Academy</option>
                </Select>
                <Select
                  label="Website visibility"
                  value={form.visibility}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      visibility: event.target.value as EventTemplateForm["visibility"],
                    })
                  }
                >
                  <option value="public">Public</option>
                  <option value="members_only">Members-only</option>
                  <option value="invite_only">Invite-only</option>
                </Select>
                <Select
                  label="Attendance access"
                  value={form.visibility === "invite_only" ? "invite_only" : form.tier_access}
                  disabled={form.visibility === "invite_only"}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tier_access: event.target.value as EventTemplateForm["tier_access"],
                    })
                  }
                >
                  <option value="public">Anyone who registers</option>
                  <option value="community">Community members</option>
                  <option value="club">Club members</option>
                  <option value="academy">Academy students</option>
                  <option value="invite_only">Invitees only</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Select
                  label="Format"
                  value={form.location_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      location_type: event.target.value as EventTemplateForm["location_type"],
                    })
                  }
                >
                  <option value="physical">Physical</option>
                  <option value="online">Online</option>
                  <option value="hybrid">Hybrid</option>
                </Select>
                <PoolPicker
                  label="Pool venue"
                  value={form.pool_id}
                  onChange={(poolId, poolName, pool) =>
                    setForm({
                      ...form,
                      pool_id: poolId,
                      location: poolId
                        ? pool?.address
                          ? `${poolName}, ${pool.address}`
                          : (poolName ?? "")
                        : "",
                      location_area: poolId ? (pool?.location_area ?? "") : "",
                    })
                  }
                  hint="Generated drafts inherit this pool and its canonical area."
                />
                <Input
                  label="Venue or meeting link"
                  value={form.location}
                  onChange={(event) =>
                    setForm({ ...form, pool_id: null, location: event.target.value })
                  }
                  readOnly={Boolean(form.pool_id)}
                  hint={form.pool_id ? "Filled from the Pool Registry" : undefined}
                />
                <Input
                  label="Location area"
                  value={form.location_area}
                  onChange={(event) => setForm({ ...form, location_area: event.target.value })}
                  readOnly={Boolean(form.pool_id)}
                  hint={
                    form.pool_id
                      ? "Filled from the pool's operating area"
                      : "Use the most-specific area for a non-pool venue"
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <Input
                  label="Local start time"
                  type="time"
                  value={form.local_start_time}
                  onChange={(event) => setForm({ ...form, local_start_time: event.target.value })}
                  required
                />
                <Input
                  label="Duration (minutes)"
                  type="number"
                  min={15}
                  max={1440}
                  value={form.duration_minutes}
                  onChange={(event) =>
                    setForm({ ...form, duration_minutes: Number(event.target.value) })
                  }
                  required
                />
                <Input
                  label="Capacity"
                  type="number"
                  min={1}
                  value={form.max_capacity}
                  onChange={(event) => setForm({ ...form, max_capacity: event.target.value })}
                />
                <Select
                  label="Pricing treatment"
                  value={form.pricing_mode}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      pricing_mode: event.target.value as EventTemplateForm["pricing_mode"],
                    })
                  }
                >
                  <option value="free">Free</option>
                  <option value="included">Included</option>
                  <option value="fixed">Fixed price</option>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {form.pricing_mode === "fixed" ? (
                  <Input
                    label="Price (₦)"
                    type="number"
                    min={0}
                    value={form.cost_naira}
                    onChange={(event) => setForm({ ...form, cost_naira: event.target.value })}
                  />
                ) : (
                  <div />
                )}
                <Select
                  label="Email reminders"
                  value={reminderProfile(form.email_reminder_hours)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      email_reminder_hours:
                        REMINDER_PROFILES[event.target.value as ReminderProfile],
                    })
                  }
                >
                  <option value="none">None</option>
                  <option value="standard">Standard · 72h and 24h</option>
                  <option value="online_talk">Online Talk · 7d, 24h and 1h</option>
                  <option value="major_event">Major event · 14d, 7d and 24h</option>
                </Select>
              </div>

              <fieldset className="space-y-4 border-y border-slate-200 py-4">
                <legend className="text-sm font-semibold text-slate-900">Recurrence rule</legend>
                <div className="grid gap-4 md:grid-cols-4">
                  <Select
                    label="Frequency"
                    value={form.frequency}
                    onChange={(event) =>
                      setForm({ ...form, frequency: event.target.value as EventFrequency })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                  </Select>
                  <Input
                    label={`Every ${form.frequency === "weekly" ? "weeks" : form.frequency === "annual" ? "years" : form.frequency === "quarterly" ? "quarters" : "months"}`}
                    type="number"
                    min={1}
                    max={12}
                    value={form.interval}
                    onChange={(event) => setForm({ ...form, interval: Number(event.target.value) })}
                    required
                  />
                  <Input
                    label="Starts on"
                    type="date"
                    value={form.starts_on}
                    onChange={(event) => setForm({ ...form, starts_on: event.target.value })}
                    required
                  />
                  <Input
                    label="Ends on"
                    type="date"
                    value={form.ends_on}
                    onChange={(event) => setForm({ ...form, ends_on: event.target.value })}
                  />
                </div>

                {form.frequency === "weekly" ? (
                  <Select
                    label="Day of week"
                    value={form.day_of_week ?? 0}
                    onChange={(event) =>
                      setForm({ ...form, day_of_week: Number(event.target.value) })
                    }
                  >
                    {DAYS.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {form.frequency === "monthly" || form.frequency === "quarterly" ? (
                  <div className="space-y-4">
                    <div className="inline-flex rounded-md border border-slate-200 p-1">
                      <button
                        type="button"
                        onClick={() => setMonthlyRule("weekday")}
                        className={`rounded px-3 py-2 text-sm font-medium ${monthlyRule === "weekday" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                      >
                        Weekday pattern
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthlyRule("date")}
                        className={`rounded px-3 py-2 text-sm font-medium ${monthlyRule === "date" ? "bg-slate-900 text-white" : "text-slate-600"}`}
                      >
                        Calendar date
                      </button>
                    </div>
                    {monthlyRule === "weekday" ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <Select
                          label="Week of month"
                          value={form.week_of_month ?? 1}
                          onChange={(event) =>
                            setForm({ ...form, week_of_month: Number(event.target.value) })
                          }
                        >
                          <option value={1}>First</option>
                          <option value={2}>Second</option>
                          <option value={3}>Third</option>
                          <option value={4}>Fourth</option>
                          <option value={5}>Fifth</option>
                          <option value={-1}>Last</option>
                        </Select>
                        <Select
                          label="Day of week"
                          value={form.day_of_week ?? 0}
                          onChange={(event) =>
                            setForm({ ...form, day_of_week: Number(event.target.value) })
                          }
                        >
                          {DAYS.map((day, index) => (
                            <option key={day} value={index}>
                              {day}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <Input
                        label="Day of month"
                        type="number"
                        min={1}
                        max={31}
                        value={form.day_of_month ?? 1}
                        onChange={(event) =>
                          setForm({ ...form, day_of_month: Number(event.target.value) })
                        }
                      />
                    )}
                  </div>
                ) : null}

                {form.frequency === "annual" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Select
                      label="Month"
                      value={form.month_of_year ?? 1}
                      onChange={(event) =>
                        setForm({ ...form, month_of_year: Number(event.target.value) })
                      }
                    >
                      {MONTHS.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label="Day"
                      type="number"
                      min={1}
                      max={31}
                      value={form.day_of_month ?? 1}
                      onChange={(event) =>
                        setForm({ ...form, day_of_month: Number(event.target.value) })
                      }
                    />
                  </div>
                ) : null}
              </fieldset>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Active template
              </label>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save template"}
                </Button>
              </div>
            </form>
          ) : null}

          {!showEditor && templates.length === 0 ? (
            <div className="border-y border-slate-200 py-14 text-center">
              <RefreshCw className="mx-auto h-9 w-9 text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900">No recurring templates yet</h2>
            </div>
          ) : null}

          {!showEditor
            ? templates.map((template) => {
                const range = ranges[template.id] ?? { from_date: "", to_date: "" };
                const preview = previews[template.id] ?? [];
                const busy = workingTemplateId === template.id;
                return (
                  <section
                    key={template.id}
                    className="rounded-md border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold text-slate-950">{template.title}</h2>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {template.audience}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${template.is_active ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-500"}`}
                          >
                            {template.is_active ? "active" : "inactive"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {describeRule(template)} at {template.local_start_time.slice(0, 5)} ·{" "}
                          {template.duration_minutes} minutes
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {template.visibility.replace("_", " ")} ·{" "}
                          {template.tier_access.replace("_", " ")} access ·{" "}
                          {template.location || "Venue not set"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(template)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
                          aria-label={`Edit ${template.title}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTemplate(template)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-rose-600 hover:bg-rose-50"
                          aria-label={`Delete ${template.title}`}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                      <Input
                        label="Generate from"
                        type="date"
                        value={range.from_date}
                        onChange={(event) =>
                          setRanges({
                            ...ranges,
                            [template.id]: { ...range, from_date: event.target.value },
                          })
                        }
                      />
                      <Input
                        label="Generate through"
                        type="date"
                        value={range.to_date}
                        onChange={(event) =>
                          setRanges({
                            ...ranges,
                            [template.id]: { ...range, to_date: event.target.value },
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void previewDates(template.id)}
                        disabled={busy}
                      >
                        Preview dates
                      </Button>
                      <Button
                        type="button"
                        onClick={() => void generateDrafts(template.id)}
                        disabled={busy || !template.is_active}
                        className="gap-2"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Generate drafts
                      </Button>
                    </div>

                    {preview.length ? (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <p className="text-sm font-semibold text-slate-800">
                          {preview.length} occurrence{preview.length === 1 ? "" : "s"}
                        </p>
                        <div className="mt-2 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                          {preview.map((occurrence) => (
                            <span
                              key={occurrence.external_key}
                              className="rounded bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800"
                            >
                              {format(new Date(occurrence.start_time), "d MMM yyyy")}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                );
              })
            : null}
        </div>
      ) : (
        <div className="space-y-5">
          <section className="border-y border-slate-200 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">
                  Upload the reviewed annual calendar
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  The workbook must include the controlled <strong>Calendar Import</strong> sheet.
                </p>
              </div>
              <label className="inline-flex min-h-[44px] w-fit cursor-pointer items-center justify-center gap-2 rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500">
                <Upload className="h-4 w-4" />
                {uploading ? "Reading workbook..." : "Choose .xlsx file"}
                <input
                  type="file"
                  accept=".xlsx"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => void handleWorkbook(event.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </section>

          {importResult ? (
            <div className="flex flex-col gap-3 border-y border-green-200 bg-green-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-700" />
                <p className="text-sm text-green-900">
                  {importResult.created} drafts created. {importResult.skipped_existing} duplicate
                  rows were skipped.
                </p>
              </div>
              <Link
                href="/admin/community/events"
                className="text-sm font-semibold text-green-800 hover:text-green-700"
              >
                Review event drafts
              </Link>
            </div>
          ) : null}

          {importPreview ? (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-950">Import preview</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {importPreview.valid_count} valid · {importPreview.invalid_count} need
                    correction · {selectedEvents.length} selected
                  </p>
                </div>
                <Button
                  onClick={() => void commitImport()}
                  disabled={importing || selectedEvents.length === 0}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {importing ? "Creating drafts..." : `Import ${selectedEvents.length} drafts`}
                </Button>
              </div>

              <div className="overflow-x-auto border-y border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="w-12 px-3 py-3">Use</th>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Event</th>
                      <th className="px-3 py-3">Audience</th>
                      <th className="px-3 py-3">Visibility</th>
                      <th className="px-3 py-3">Review notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.rows.map((row) => {
                      const selectable = Boolean(row.event && row.errors.length === 0);
                      return (
                        <tr key={row.source_row} className={!selectable ? "bg-rose-50" : undefined}>
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.source_row)}
                              disabled={!selectable}
                              onChange={() =>
                                setSelectedRows((current) => {
                                  const next = new Set(current);
                                  if (next.has(row.source_row)) next.delete(row.source_row);
                                  else next.add(row.source_row);
                                  return next;
                                })
                              }
                              aria-label={`Include row ${row.source_row}`}
                            />
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 align-top text-slate-600">
                            {row.event
                              ? format(new Date(row.event.start_time), "d MMM yyyy, h:mm a")
                              : `Row ${row.source_row}`}
                          </td>
                          <td className="min-w-64 px-3 py-3 align-top">
                            <p className="font-medium text-slate-900">
                              {row.event?.title ?? "Invalid row"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {row.event?.event_type.replaceAll("_", " ")}
                            </p>
                          </td>
                          <td className="px-3 py-3 align-top text-slate-600">
                            {row.event?.audience ?? "—"}
                          </td>
                          <td className="px-3 py-3 align-top text-slate-600">
                            {row.event?.visibility.replace("_", " ") ?? "—"}
                          </td>
                          <td className="min-w-72 px-3 py-3 align-top">
                            {row.errors.map((message) => (
                              <p key={message} className="text-xs font-medium text-rose-700">
                                {message}
                              </p>
                            ))}
                            {row.warnings.map((message) => (
                              <p key={message} className="text-xs text-amber-700">
                                {message}
                              </p>
                            ))}
                            {!row.errors.length && !row.warnings.length ? (
                              <span className="text-xs text-green-700">Ready</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div className="border-y border-slate-200 py-14 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" />
              <h2 className="mt-3 font-semibold text-slate-900">No workbook selected</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload the reviewed workbook to validate every row before creating drafts.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
