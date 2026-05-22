"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CATEGORY_LABELS, type VolunteerRoleCategory } from "@/lib/volunteers";

export type RoleForm = {
  title: string;
  description: string;
  category: VolunteerRoleCategory;
  icon: string;
  min_tier: "tier_1" | "tier_2" | "tier_3";
  time_commitment: string;
  responsibilities: string;
  skills_needed: string;
  best_for: string;
};

type Props = {
  roleForm: RoleForm;
  setRoleForm: React.Dispatch<React.SetStateAction<RoleForm>>;
  // The Edit modal uses 5 rows for responsibilities vs Create's 4.
  responsibilitiesRows?: number;
  titleRequired?: boolean;
  showTitlePlaceholder?: boolean;
};

export function RoleFormFields({
  roleForm,
  setRoleForm,
  responsibilitiesRows = 4,
  titleRequired = true,
  showTitlePlaceholder = true,
}: Props) {
  return (
    <>
      <Input
        label="Title"
        value={roleForm.title}
        onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })}
        required={titleRequired}
        placeholder={showTitlePlaceholder ? "e.g., Media Volunteer" : undefined}
      />
      <Textarea
        label="Description"
        value={roleForm.description}
        onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
        rows={3}
        placeholder="Describe the role and responsibilities..."
      />
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <Select
          label="Category"
          value={roleForm.category}
          onChange={(e) =>
            setRoleForm({
              ...roleForm,
              category: e.target.value as VolunteerRoleCategory,
            })
          }
        >
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          label="Icon (emoji)"
          value={roleForm.icon}
          onChange={(e) => setRoleForm({ ...roleForm, icon: e.target.value })}
          placeholder="e.g., 📸"
        />
      </div>
      <Select
        label="Minimum Tier"
        value={roleForm.min_tier}
        onChange={(e) =>
          setRoleForm({
            ...roleForm,
            min_tier: e.target.value as "tier_1" | "tier_2" | "tier_3",
          })
        }
      >
        <option value="tier_1">Tier 1 — Anyone</option>
        <option value="tier_2">Tier 2 — Core</option>
        <option value="tier_3">Tier 3 — Lead</option>
      </Select>

      <div className="border-t border-slate-200 pt-4">
        <h4 className="text-sm font-medium text-slate-700 mb-3">
          Role Details (shown to members)
        </h4>
        <div className="space-y-3">
          <Input
            label="Time Commitment"
            value={roleForm.time_commitment}
            onChange={(e) =>
              setRoleForm({
                ...roleForm,
                time_commitment: e.target.value,
              })
            }
            placeholder="e.g., 90–120 min (full session + 15 min before/after)"
          />
          <Textarea
            label="Responsibilities (one per line)"
            value={roleForm.responsibilities}
            onChange={(e) =>
              setRoleForm({
                ...roleForm,
                responsibilities: e.target.value,
              })
            }
            rows={responsibilitiesRows}
            placeholder={
              "Arrive 15 minutes before session starts\nBrief other volunteers on the day's plan\nHandle any on-the-ground issues"
            }
          />
          <Textarea
            label="Skills Needed"
            value={roleForm.skills_needed}
            onChange={(e) =>
              setRoleForm({
                ...roleForm,
                skills_needed: e.target.value,
              })
            }
            rows={2}
            placeholder="e.g., Comfortable speaking to groups. Calm under mild pressure."
          />
          <Textarea
            label="Best For"
            value={roleForm.best_for}
            onChange={(e) => setRoleForm({ ...roleForm, best_for: e.target.value })}
            rows={2}
            placeholder="e.g., People who like organising and being the go-to person."
          />
        </div>
      </div>
    </>
  );
}
