"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  type CurriculumDefinition,
  CurriculumLibraryApi,
  type MilestoneRemedialDrillLink,
} from "@/lib/academy/curriculum-library";

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : "The request could not be completed.";

export function MilestoneRemedialDrillsPanel({
  milestoneDefinitionId,
  onError,
}: {
  milestoneDefinitionId: string;
  onError: (msg: string) => void;
}) {
  const [links, setLinks] = useState<MilestoneRemedialDrillLink[]>([]);
  const [drills, setDrills] = useState<CurriculumDefinition[]>([]);
  const [drillId, setDrillId] = useState("");
  const [priority, setPriority] = useState("0");
  const [coachTip, setCoachTip] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLinks(
        await CurriculumLibraryApi.listMilestoneRemedialDrills(milestoneDefinitionId),
      );
    } catch {
      setLinks([]);
    }
  }, [milestoneDefinitionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    CurriculumLibraryApi.definitions("drill")
      .then((list) => {
        const active = list.filter((d) => !d.is_retired);
        setDrills(active);
        if (active[0]) setDrillId((prev) => prev || active[0].id);
      })
      .catch(() => {});
  }, []);

  const attach = async () => {
    if (!drillId) return;
    setBusy(true);
    try {
      await CurriculumLibraryApi.attachMilestoneRemedialDrill(milestoneDefinitionId, {
        drill_id: drillId,
        priority_order: Math.max(0, Number(priority) || 0),
        coach_tip: coachTip.trim() || null,
      });
      setCoachTip("");
      await reload();
      toast.success("Remedial TI drill linked");
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (linkId: string) => {
    setBusy(true);
    try {
      await CurriculumLibraryApi.removeMilestoneRemedialDrill(
        milestoneDefinitionId,
        linkId,
      );
      await reload();
      toast.success("Remedial drill removed");
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Recommended TI remedial drills
        </h3>
        <p className="text-xs text-slate-500">
          Automatically surfaced to learners and coaches when this milestone is not yet verified.
        </p>
      </div>

      {links.length === 0 ? (
        <p className="text-xs text-slate-500">No remedial drills linked yet.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  #{item.priority_order + 1} · {item.drill_title ?? item.drill_code}
                </p>
                {item.primary_focal_cue && (
                  <p className="text-cyan-900">Focal cue: {item.primary_focal_cue}</p>
                )}
                {item.coach_tip && (
                  <p className="text-slate-600">Coach tip: {item.coach_tip}</p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(item.id)}
                className="font-medium text-rose-700 hover:underline disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {drills.length > 0 && (
        <div className="grid gap-2 border-t border-slate-200 pt-3 md:grid-cols-2">
          <select
            value={drillId}
            onChange={(e) => setDrillId(e.target.value)}
            className="min-h-10 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
          >
            {drills.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.code})
              </option>
            ))}
          </select>
          <Input
            label="Priority order"
            name="remedial-priority"
            type="number"
            min="0"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          />
          <div className="md:col-span-2">
            <Input
              label="Coach tip (optional)"
              name="remedial-tip"
              value={coachTip}
              onChange={(e) => setCoachTip(e.target.value)}
              placeholder="e.g. Focus on unbroken nasal hum before surfacing."
            />
          </div>
          <div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy || !drillId}
              onClick={() => void attach()}
            >
              Link remedial drill
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
