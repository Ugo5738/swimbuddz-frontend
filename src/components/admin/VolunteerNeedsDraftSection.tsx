"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useApi } from "@/hooks/useApi";
import type { VolunteerNeedDraft } from "@/lib/session-volunteers";
import {
  TIER_LABELS,
  type OpportunityType,
  type VolunteerOpportunityTemplate,
  type VolunteerRole,
  type VolunteerTier,
} from "@/lib/volunteers";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export type { VolunteerNeedDraft } from "@/lib/session-volunteers";

const EMPTY_NEED: VolunteerNeedDraft = {
  source_template_id: null,
  role_id: "",
  role_title: "",
  slots_needed: 1,
  opportunity_type: "open_claim",
  min_tier: "tier_1",
  title_override: "",
  description: "",
  start_time: "",
  end_time: "",
  cancellation_deadline_hours: 24,
  qr_checkin_enabled: false,
};

type Props = {
  needs: VolunteerNeedDraft[];
  onChange: (needs: VolunteerNeedDraft[]) => void;
  description: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
};

function shortTime(value: string | null | undefined): string {
  return value?.slice(0, 5) ?? "";
}

function addMinutes(value: string, minutes: number): string {
  const [hours, mins] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return "";
  const total = (hours * 60 + mins + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function VolunteerNeedsDraftSection({
  needs,
  onChange,
  description,
  defaultStartTime = "",
  defaultEndTime = "",
}: Props) {
  const { data: rolesData, loading: loadingRoles } = useApi<VolunteerRole[]>(
    "/api/v1/volunteers/roles?active_only=false",
    { auth: false }
  );
  const {
    data: templatesData,
    error: templatesError,
    loading: loadingTemplates,
  } = useApi<VolunteerOpportunityTemplate[]>(
    "/api/v1/admin/volunteers/opportunity-templates?active_only=true"
  );
  const [draft, setDraft] = useState<VolunteerNeedDraft>(EMPTY_NEED);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const roles = (rolesData ?? []).filter((role) => role.is_active);
  const templates = templatesData ?? [];
  const effectiveStartTime = draft.start_time || shortTime(defaultStartTime);
  const effectiveEndTime = draft.end_time || shortTime(defaultEndTime);

  const chooseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setValidationError(null);
    if (!templateId) {
      setDraft(EMPTY_NEED);
      return;
    }
    const template = templates.find((candidate) => candidate.id === templateId);
    if (!template) return;
    const templateStart = shortTime(template.start_time);
    const role = roles.find((candidate) => candidate.id === template.role_id);
    setDraft({
      source_template_id: template.id,
      role_id: template.role_id,
      role_title: template.role_title ?? role?.title ?? "",
      slots_needed: template.slots_needed,
      opportunity_type: template.opportunity_type,
      min_tier: template.min_tier,
      title_override: template.title,
      description: template.description ?? "",
      start_time: templateStart,
      end_time: addMinutes(templateStart, template.duration_minutes),
      cancellation_deadline_hours: template.cancellation_deadline_hours,
      qr_checkin_enabled: template.qr_checkin_enabled,
    });
  };

  const addNeed = () => {
    if (!draft.role_id) {
      setValidationError("Pick a volunteer role first.");
      return;
    }
    if (!effectiveStartTime || !effectiveEndTime) {
      setValidationError("Add a start and end time for this volunteer shift.");
      return;
    }
    onChange([
      ...needs,
      {
        ...draft,
        role_title:
          draft.role_title ||
          roles.find((candidate) => candidate.id === draft.role_id)?.title ||
          "",
        start_time: effectiveStartTime,
        end_time: effectiveEndTime,
      },
    ]);
    setDraft(EMPTY_NEED);
    setSelectedTemplateId("");
    setValidationError(null);
  };

  return (
    <fieldset className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <legend className="text-sm font-semibold text-slate-900">Volunteer opportunities</legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
        </div>
        <Link
          href="/admin/community/volunteers?tab=templates"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-900"
        >
          Manage volunteer templates <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {needs.length > 0 && (
        <ul className="space-y-2" aria-label="Volunteer opportunities to create">
          {needs.map((need, index) => {
            const role = roles.find((candidate) => candidate.id === need.role_id);
            return (
              <li
                key={`${need.role_id}-${need.start_time}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {need.title_override || role?.title || need.role_title || "Volunteer role"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {shortTime(need.start_time)}–{shortTime(need.end_time)} · {need.slots_needed}{" "}
                    slot
                    {need.slots_needed === 1 ? "" : "s"} · {TIER_LABELS[need.min_tier]} ·{" "}
                    {need.opportunity_type === "open_claim" ? "Open claim" : "Approval required"}
                    {need.source_template_id ? " · From template" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(needs.filter((_, needIndex) => needIndex !== index))}
                  aria-label={`Remove ${need.title_override || role?.title || "volunteer role"}`}
                  className="shrink-0 text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Select
        label="Start from a volunteer template (optional)"
        value={selectedTemplateId}
        disabled={loadingTemplates}
        error={templatesError ?? undefined}
        hint="Copies the template into this session; you can adjust every field below."
        onChange={(event) => chooseTemplate(event.target.value)}
      >
        <option value="">
          {loadingTemplates ? "Loading templates…" : "— Create a fresh opportunity —"}
        </option>
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.title} · {template.role_title ?? "Volunteer"}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Role"
          value={draft.role_id}
          disabled={loadingRoles}
          onChange={(event) => {
            const role = roles.find((candidate) => candidate.id === event.target.value);
            setDraft({
              ...draft,
              source_template_id: null,
              role_id: event.target.value,
              role_title: role?.title ?? "",
            });
          }}
          required
        >
          <option value="">{loadingRoles ? "Loading roles…" : "— Pick role —"}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.icon} {role.title}
            </option>
          ))}
        </Select>
        <Input
          label="Slots needed"
          type="number"
          min={1}
          value={draft.slots_needed}
          onChange={(event) =>
            setDraft({ ...draft, slots_needed: Math.max(1, Number(event.target.value) || 1) })
          }
        />
      </div>

      <Input
        label="Opportunity title"
        value={draft.title_override}
        onChange={(event) => setDraft({ ...draft, title_override: event.target.value })}
        placeholder={draft.role_title || "Defaults to the role title"}
        hint="Use a specific title when the role name alone is not clear."
      />
      <Textarea
        label="Description"
        value={draft.description}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        placeholder="What the volunteer will do, where to report, and anything they should bring."
        rows={3}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Volunteer start time"
          type="time"
          value={effectiveStartTime}
          onChange={(event) => setDraft({ ...draft, start_time: event.target.value })}
          required
        />
        <Input
          label="Volunteer end time"
          type="time"
          value={effectiveEndTime}
          onChange={(event) => setDraft({ ...draft, end_time: event.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="How members join"
          value={draft.opportunity_type}
          onChange={(event) =>
            setDraft({ ...draft, opportunity_type: event.target.value as OpportunityType })
          }
        >
          <option value="open_claim">Open claim</option>
          <option value="approval_required">Admin approval required</option>
        </Select>
        <Select
          label="Minimum volunteer tier"
          value={draft.min_tier}
          onChange={(event) =>
            setDraft({ ...draft, min_tier: event.target.value as VolunteerTier })
          }
        >
          <option value="tier_1">Tier 1 — Anyone</option>
          <option value="tier_2">Tier 2 — Core</option>
          <option value="tier_3">Tier 3 — Lead</option>
        </Select>
        <Input
          label="Cancellation deadline (hours)"
          type="number"
          min={0}
          value={draft.cancellation_deadline_hours}
          onChange={(event) =>
            setDraft({
              ...draft,
              cancellation_deadline_hours: Math.max(0, Number(event.target.value) || 0),
            })
          }
        />
        <label className="flex min-h-11 items-center gap-2 self-end rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={draft.qr_checkin_enabled}
            onChange={(event) => setDraft({ ...draft, qr_checkin_enabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          Enable volunteer QR check-in
        </label>
      </div>

      {validationError && <p className="text-xs font-medium text-rose-600">{validationError}</p>}

      <Button
        type="button"
        variant="secondary"
        onClick={addNeed}
        disabled={!draft.role_id}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" /> Add volunteer opportunity
      </Button>
    </fieldset>
  );
}
