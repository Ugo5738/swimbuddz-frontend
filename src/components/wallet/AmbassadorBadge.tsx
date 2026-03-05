"use client";

import { formatDate } from "@/lib/format";
import { Trophy } from "lucide-react";

type AmbassadorBadgeProps = {
  isAmbassador: boolean;
  ambassadorSince?: string | null;
  referralCount: number;
  requiredReferrals?: number;
  size?: "sm" | "md";
};

export function AmbassadorBadge({
  isAmbassador,
  ambassadorSince,
  referralCount,
  requiredReferrals = 10,
  size = "md",
}: AmbassadorBadgeProps) {
  const progress = Math.min(referralCount / requiredReferrals, 1);

  if (isAmbassador) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 ${size === "sm" ? "px-3 py-2" : "px-4 py-3"}`}
      >
        <div className="rounded-full bg-amber-400 p-1.5">
          <Trophy className={`text-amber-900 ${size === "sm" ? "h-4 w-4" : "h-5 w-5"}`} />
        </div>
        <div>
          <p className={`font-semibold text-amber-900 ${size === "sm" ? "text-sm" : "text-base"}`}>
            Ambassador
          </p>
          {ambassadorSince && (
            <p className="text-xs text-amber-700">Since {formatDate(ambassadorSince)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-slate-50 border border-slate-200 ${size === "sm" ? "px-3 py-2" : "px-4 py-3"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className={`font-medium text-slate-700 ${size === "sm" ? "text-sm" : "text-base"}`}>
          Ambassador Progress
        </p>
        <span className="text-sm text-slate-500">
          {referralCount}/{requiredReferrals}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">
        {requiredReferrals - referralCount} more referral
        {requiredReferrals - referralCount !== 1 ? "s" : ""} to become an Ambassador
      </p>
    </div>
  );
}
