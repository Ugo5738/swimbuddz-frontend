"use client";

import { PodPicker } from "@/components/admin/PodPicker";
import { ClubPicker } from "@/components/ui/ClubPicker";
import type { Club } from "@/lib/clubs";
import type { PodSummary } from "@/lib/pods";

type ClubSessionScopeFieldsProps = {
  clubId: string | null;
  scope: "general" | "pod";
  podId: string | null;
  onClubChange: (clubId: string | null, club?: Club | null) => void;
  onScopeChange: (scope: "general" | "pod") => void;
  onPodChange: (podId: string | null, pod?: PodSummary | null) => void;
};

/** Club ownership and optional Pod audience for Club sessions/templates. */
export function ClubSessionScopeFields({
  clubId,
  scope,
  podId,
  onClubChange,
  onScopeChange,
  onPodChange,
}: ClubSessionScopeFieldsProps) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div>
        <legend className="text-sm font-semibold text-slate-900">Club and audience</legend>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Choose the Club location first. Pod names can repeat across Clubs, so only Pods from the
          selected Club will be shown.
        </p>
      </div>

      <ClubPicker
        label="Club / location"
        value={clubId}
        onChange={onClubChange}
        placeholder="Search by Club or location…"
        helpText="This remains the session owner whether the audience is general or Pod-specific."
        required
      />

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Audience</span>
        <div
          className={`grid grid-cols-2 rounded-md border border-slate-200 p-1 ${
            clubId ? "bg-white" : "bg-slate-100 opacity-60"
          }`}
          role="radiogroup"
          aria-label="Club session audience"
          aria-disabled={!clubId}
        >
          <button
            type="button"
            role="radio"
            aria-checked={scope === "general"}
            disabled={!clubId}
            onClick={() => onScopeChange("general")}
            className={`min-h-10 rounded px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
              scope === "general" ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            General Club
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={scope === "pod"}
            disabled={!clubId}
            onClick={() => onScopeChange("pod")}
            className={`min-h-10 rounded px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${
              scope === "pod" ? "bg-cyan-700 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Pod-specific
          </button>
        </div>
      </div>

      {scope === "pod" && (
        <PodPicker
          label="Pod"
          clubId={clubId}
          value={podId}
          onChange={onPodChange}
          helpText="The Club name and location remain visible so repeated Pod names are unambiguous."
          required
        />
      )}
    </fieldset>
  );
}
