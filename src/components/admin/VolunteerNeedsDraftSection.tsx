"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TIER_LABELS, VolunteersApi, type OpportunityType, type VolunteerRole, type VolunteerTier } from "@/lib/volunteers";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export type VolunteerNeedDraft = {
  role_id: string;
  role_title: string;
  slots_needed: number;
  opportunity_type: OpportunityType;
  min_tier: VolunteerTier;
  title_override: string;
};

const EMPTY_NEED: VolunteerNeedDraft = {
  role_id: "",
  role_title: "",
  slots_needed: 1,
  opportunity_type: "open_claim",
  min_tier: "tier_1",
  title_override: "",
};

type Props = {
  needs: VolunteerNeedDraft[];
  onChange: (needs: VolunteerNeedDraft[]) => void;
  description: string;
};

export function VolunteerNeedsDraftSection({ needs, onChange, description }: Props) {
  const [roles, setRoles] = useState<VolunteerRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [draft, setDraft] = useState<VolunteerNeedDraft>(EMPTY_NEED);

  useEffect(() => {
    let cancelled = false;
    void VolunteersApi.listRoles(false)
      .then((rows) => {
        if (!cancelled) setRoles(rows.filter((role) => role.is_active));
      })
      .catch((error) => console.error("Failed to load volunteer roles", error))
      .finally(() => {
        if (!cancelled) setLoadingRoles(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addNeed = () => {
    if (!draft.role_id) return;
    onChange([...needs, draft]);
    setDraft(EMPTY_NEED);
  };

  return (
    <fieldset className="space-y-4 rounded-xl border border-cyan-200 bg-cyan-50/50 p-4">
      <div>
        <legend className="text-sm font-semibold text-slate-900">Volunteer opportunities</legend>
        <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
      </div>

      {needs.length > 0 && (
        <ul className="space-y-2" aria-label="Volunteer opportunities to create">
          {needs.map((need, index) => {
            const role = roles.find((candidate) => candidate.id === need.role_id);
            return (
              <li
                key={`${need.role_id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-cyan-100 bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {need.title_override || role?.title || "Volunteer role"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {need.slots_needed} slot{need.slots_needed === 1 ? "" : "s"} ·{" "}
                    {TIER_LABELS[need.min_tier]} ·{" "}
                    {need.opportunity_type === "open_claim" ? "Open claim" : "Approval required"}
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Role"
          value={draft.role_id}
          disabled={loadingRoles}
          onChange={(event) => {
            const role = roles.find((candidate) => candidate.id === event.target.value);
            setDraft({
              ...draft,
              role_id: event.target.value,
              role_title: role?.title ?? "",
            });
          }}
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
      </div>
      <Input
        label="Custom title (optional)"
        value={draft.title_override}
        onChange={(event) => setDraft({ ...draft, title_override: event.target.value })}
        placeholder="Defaults to the role title"
      />
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
