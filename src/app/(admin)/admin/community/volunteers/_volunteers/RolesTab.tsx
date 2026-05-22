"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CATEGORY_GROUPS, type VolunteerRole } from "@/lib/volunteers";
import { Plus, Settings } from "lucide-react";

import { RoleCard } from "../components";

type Props = {
  roles: VolunteerRole[];
  onCreate: () => void;
  onEdit: (role: VolunteerRole) => void;
  onToggle: (roleId: string, currentActive: boolean) => Promise<void>;
};

export function RolesTab({ roles, onCreate, onEdit, onToggle }: Props) {
  const allGroupedCategories = Object.values(CATEGORY_GROUPS).flatMap((g) => g.categories);
  const ungrouped = roles.filter((r) => !allGroupedCategories.includes(r.category));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Role
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card className="py-12 text-center">
          <Settings className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No roles created yet.</p>
        </Card>
      ) : (
        Object.entries(CATEGORY_GROUPS).map(([groupKey, group]) => {
          const groupRoles = roles.filter((r) => group.categories.includes(r.category));
          if (groupRoles.length === 0) return null;

          return (
            <div key={groupKey}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {group.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupRoles
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((role) => (
                    <RoleCard key={role.id} role={role} onEdit={onEdit} onToggle={onToggle} />
                  ))}
              </div>
            </div>
          );
        })
      )}

      {ungrouped.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Other
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ungrouped.map((role) => (
              <RoleCard key={role.id} role={role} onEdit={onEdit} onToggle={onToggle} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
