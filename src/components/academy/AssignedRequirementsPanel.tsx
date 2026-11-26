"use client";

import type {
  CohortAssignments,
  ProgramAssignments,
} from "@/lib/academy/requirements";

interface AssignedRequirementsPanelProps {
  cohortId: string;
  busy: boolean;
  programAssignments: ProgramAssignments | null;
  cohortAssignments: CohortAssignments | null;
  onRemoveProgramModule: (assignmentId: string) => void;
  onRemoveProgramMilestone: (assignmentId: string) => void;
  onRemoveCohortMilestone: (assignmentId: string) => void;
}

export function AssignedRequirementsPanel({
  cohortId,
  busy,
  programAssignments,
  cohortAssignments,
  onRemoveProgramModule,
  onRemoveProgramMilestone,
  onRemoveCohortMilestone,
}: AssignedRequirementsPanelProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">
          Current programme defaults
        </h2>
        <p className="text-xs text-slate-500">
          Removing a default affects unfrozen cohorts only; already-frozen cohorts
          keep their snapshot.
        </p>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Modules ({programAssignments?.modules.length ?? 0})
          </p>
          {!programAssignments || programAssignments.modules.length === 0 ? (
            <p className="text-xs text-slate-500">No modules linked yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {programAssignments.modules.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <span>
                    #{item.order_index + 1} · {item.title ?? item.code} (v{item.version})
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemoveProgramModule(item.id)}
                    className="font-medium text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Direct milestones ({programAssignments?.milestones.length ?? 0})
          </p>
          {!programAssignments || programAssignments.milestones.length === 0 ? (
            <p className="text-xs text-slate-500">No direct milestones linked yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {programAssignments.milestones.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
                >
                  <span>
                    {item.title ?? item.code} (v{item.version})
                    {item.target_week ? ` · Week ${item.target_week}` : ""}
                    {item.safety_gate ? " · Safety gate" : ""}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemoveProgramMilestone(item.id)}
                    className="font-medium text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">
          Cohort-specific overrides
        </h2>
        {!cohortId ? (
          <p className="text-xs text-slate-500">Select a cohort above.</p>
        ) : !cohortAssignments || cohortAssignments.milestones.length === 0 ? (
          <p className="text-xs text-slate-500">No cohort-specific overrides added.</p>
        ) : (
          <ul className="space-y-2">
            {cohortAssignments.milestones.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.title ?? item.code} (v{item.version})
                    {item.target_week ? ` · Week ${item.target_week}` : ""}
                  </p>
                  <p className="text-slate-600">{item.override_reason}</p>
                </div>
                {!cohortAssignments.is_frozen && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onRemoveCohortMilestone(item.id)}
                    className="font-medium text-rose-700 hover:underline disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
