"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useApi } from "@/hooks/useApi";
import {
  TIER_LABELS,
  VolunteersApi,
  type OpportunityType,
  type VolunteerOpportunity,
  type VolunteerTier,
} from "@/lib/volunteers";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

type EditableOpportunity = Pick<
  VolunteerOpportunity,
  | "title"
  | "description"
  | "date"
  | "slots_needed"
  | "start_time"
  | "end_time"
  | "opportunity_type"
  | "min_tier"
>;

function OpportunityRow({
  opportunity,
  onChanged,
}: {
  opportunity: VolunteerOpportunity;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditableOpportunity>({
    title: opportunity.title,
    description: opportunity.description,
    date: opportunity.date,
    slots_needed: opportunity.slots_needed,
    start_time: opportunity.start_time?.slice(0, 5) ?? "",
    end_time: opportunity.end_time?.slice(0, 5) ?? "",
    opportunity_type: opportunity.opportunity_type,
    min_tier: opportunity.min_tier,
  });

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Add a title for this volunteer opportunity");
      return;
    }
    setSaving(true);
    try {
      await VolunteersApi.admin.updateOpportunity(opportunity.id, {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      });
      toast.success("Volunteer opportunity updated");
      setEditing(false);
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update opportunity");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove “${opportunity.title}” from this session?`)) return;
    setSaving(true);
    try {
      await VolunteersApi.admin.cancelOpportunity(opportunity.id);
      toast.success("Volunteer opportunity removed");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove opportunity");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setSaving(true);
    try {
      await VolunteersApi.admin.publishOpportunity(opportunity.id);
      toast.success("Volunteer opportunity published to members");
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish opportunity");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className="space-y-3 rounded-xl border border-cyan-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
          <Input
            label="Slots needed"
            type="number"
            min={Math.max(opportunity.slots_filled, 1)}
            value={form.slots_needed}
            onChange={(event) =>
              setForm({
                ...form,
                slots_needed: Math.max(
                  opportunity.slots_filled,
                  Number(event.target.value) || 1
                ),
              })
            }
          />
        </div>
        <Textarea
          label="Description"
          value={form.description ?? ""}
          rows={3}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />
          <Input
            label="Start time"
            type="time"
            value={form.start_time ?? ""}
            onChange={(event) => setForm({ ...form, start_time: event.target.value })}
          />
          <Input
            label="End time"
            type="time"
            value={form.end_time ?? ""}
            onChange={(event) => setForm({ ...form, end_time: event.target.value })}
          />
          <Select
            label="How members join"
            value={form.opportunity_type}
            onChange={(event) =>
              setForm({ ...form, opportunity_type: event.target.value as OpportunityType })
            }
          >
            <option value="open_claim">Open claim</option>
            <option value="approval_required">Approval required</option>
          </Select>
          <Select
            label="Minimum tier"
            value={form.min_tier}
            onChange={(event) =>
              setForm({ ...form, min_tier: event.target.value as VolunteerTier })
            }
          >
            <option value="tier_1">Tier 1</option>
            <option value="tier_2">Tier 2</option>
            <option value="tier_3">Tier 3</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            <X className="mr-2 h-4 w-4" /> Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Save opportunity"}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-cyan-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">{opportunity.title}</p>
          <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-800">
            {opportunity.role_title ?? "Volunteer"}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {opportunity.status}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          {new Date(`${opportunity.date}T12:00:00`).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
          })} · {(opportunity.start_time ?? "—").slice(0, 5)}–
          {(opportunity.end_time ?? "—").slice(0, 5)} · {opportunity.slots_filled}/
          {opportunity.slots_needed} filled · {TIER_LABELS[opportunity.min_tier]}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {opportunity.status === "draft" && (
          <Button type="button" size="sm" onClick={() => void publish()} disabled={saving}>
            Publish
          </Button>
        )}
        <Button type="button" size="sm" variant="secondary" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => void remove()}
          disabled={saving}
          className="text-rose-600"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
        </Button>
      </div>
    </li>
  );
}

export function SessionVolunteerOpportunitiesSection({ sessionId }: { sessionId: string }) {
  const { data, error, loading, refetch } = useApi<VolunteerOpportunity[]>(
    `/api/v1/admin/volunteers/opportunities?session_id=${encodeURIComponent(sessionId)}`
  );
  const opportunities = (data ?? []).filter((opportunity) => opportunity.status !== "cancelled");

  return (
    <fieldset className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <legend className="text-sm font-semibold text-slate-900">
            Current volunteer opportunities
          </legend>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            These roles are already attached to this session. Edit them here or remove roles that
            are no longer needed.
          </p>
        </div>
        <Link
          href="/admin/community/volunteers?tab=opportunities"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-cyan-700"
        >
          Open volunteers <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : opportunities.length === 0 ? (
        <p className="rounded-lg border border-dashed border-cyan-200 bg-white p-3 text-sm text-slate-600">
          No volunteer opportunities are attached yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} onChanged={refetch} />
          ))}
        </ul>
      )}
    </fieldset>
  );
}
