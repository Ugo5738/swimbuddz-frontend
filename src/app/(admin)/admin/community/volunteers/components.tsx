// Small presentational components extracted from page.tsx during the
// file-size sweep. All pure props-driven (no parent state). If any of
// these pick up reuse from another admin route, promote to
// `src/components/admin/`.

"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS, TIER_SHORT_LABELS, type VolunteerRole } from "@/lib/volunteers";
import { Pencil } from "lucide-react";

export function TierBadge({ tier }: { tier: string }) {
  const variant = tier === "tier_3" ? "warning" : tier === "tier_2" ? "success" : "default";
  return (
    <Badge variant={variant}>
      {TIER_SHORT_LABELS[tier as keyof typeof TIER_SHORT_LABELS] || tier}
    </Badge>
  );
}

export function RecognitionBadge({ tier }: { tier: string }) {
  const emoji = tier === "gold" ? "🥇" : tier === "silver" ? "🥈" : "🥉";
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
      {emoji} {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  );
}

export function ReliabilityText({ score }: { score: number }) {
  const color =
    score < 70 ? "text-rose-600 font-medium" : score < 85 ? "text-amber-600" : "text-emerald-600";
  return <span className={color}>{score}%</span>;
}

export function OppStatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "default" | "warning" | "info" | "danger"> = {
    open: "success",
    draft: "default",
    filled: "warning",
    in_progress: "info",
    completed: "info",
    cancelled: "danger",
  };
  return <Badge variant={map[status] || "default"}>{status}</Badge>;
}

export function RoleCard({
  role,
  onEdit,
  onToggle,
}: {
  role: VolunteerRole;
  onEdit: (role: VolunteerRole) => void;
  onToggle: (roleId: string, currentActive: boolean) => void;
}) {
  const hasDetails = !!(
    role.time_commitment ||
    role.responsibilities?.length ||
    role.skills_needed ||
    role.best_for
  );

  return (
    <Card
      className={`relative group cursor-pointer transition-shadow hover:shadow-md ${!role.is_active ? "opacity-60" : ""}`}
      onClick={() => onEdit(role)}
    >
      <div className="space-y-3">
        {/* Top row: icon + title + status */}
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{role.icon || "🙋"}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-slate-900 text-sm">{role.title}</h4>
              {!role.is_active && <Badge variant="default">Inactive</Badge>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {CATEGORY_LABELS[role.category] || role.category}
            </p>
          </div>
          <Pencil className="h-4 w-4 text-slate-300 group-hover:text-cyan-500 transition-colors flex-shrink-0 mt-1" />
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2">{role.description}</p>

        {/* Meta row */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Min: {TIER_SHORT_LABELS[role.min_tier]}</span>
            <span>{role.active_volunteers_count} active</span>
            {!hasDetails && (
              <span className="text-amber-500" title="No detailed role info defined">
                ⚠
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(role);
              }}
              className="text-xs"
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(role.id, role.is_active);
              }}
              className="text-xs"
            >
              {role.is_active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
