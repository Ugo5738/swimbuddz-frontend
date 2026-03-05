"use client";

import { Card } from "@/components/ui/Card";

type RewardRuleCardProps = {
  displayName: string;
  description?: string | null;
  bubbleAmount: number;
  category: string;
  maxPerMemberLifetime?: number | null;
  maxPerMemberPeriod?: number | null;
  period?: string | null;
  requiresAdminConfirmation?: boolean;
  isMaxed?: boolean;
};

const CATEGORY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  acquisition: { bg: "bg-blue-50", text: "text-blue-700", icon: "👥" },
  retention: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "🏊" },
  community: { bg: "bg-teal-50", text: "text-teal-700", icon: "🤝" },
  spending: { bg: "bg-purple-50", text: "text-purple-700", icon: "💰" },
  academy: { bg: "bg-purple-50", text: "text-purple-700", icon: "🎓" },
};

export function RewardRuleCard({
  displayName,
  description,
  bubbleAmount,
  category,
  maxPerMemberLifetime,
  maxPerMemberPeriod,
  period,
  requiresAdminConfirmation,
  isMaxed,
}: RewardRuleCardProps) {
  const style = CATEGORY_STYLES[category] || {
    bg: "bg-slate-50",
    text: "text-slate-700",
    icon: "🫧",
  };

  return (
    <Card className={`p-4 transition-opacity ${isMaxed ? "opacity-50" : ""} ${style.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{style.icon}</span>
            <h3
              className={`font-semibold text-sm ${isMaxed ? "line-through text-slate-400" : style.text}`}
            >
              {displayName}
            </h3>
          </div>
          {description && <p className="text-xs text-slate-600 mb-2">{description}</p>}
          <div className="flex flex-wrap gap-1.5">
            {maxPerMemberPeriod && period && (
              <span className="text-xs bg-white/60 text-slate-600 px-2 py-0.5 rounded-full">
                max {maxPerMemberPeriod}/{period}
              </span>
            )}
            {maxPerMemberLifetime && (
              <span className="text-xs bg-white/60 text-slate-600 px-2 py-0.5 rounded-full">
                {isMaxed ? "completed" : `lifetime max ${maxPerMemberLifetime}`}
              </span>
            )}
            {requiresAdminConfirmation && (
              <span className="text-xs bg-white/60 text-slate-600 px-2 py-0.5 rounded-full">
                verified by admin
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0 rounded-lg bg-emerald-100 px-3 py-1.5">
          <span className="text-sm font-bold text-emerald-700">+{bubbleAmount} 🫧</span>
        </div>
      </div>
    </Card>
  );
}
