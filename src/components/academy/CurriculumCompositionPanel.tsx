"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { MilestoneRemedialDrillsPanel } from "@/components/academy/MilestoneRemedialDrillsPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  type CatalogSkill,
  type CurriculumDefinition,
  type CurriculumKind,
  CurriculumLibraryApi,
  type CurriculumVersion,
  type LessonDrillLink,
  type LinkedSkill,
  type ModuleComposition,
} from "@/lib/academy/curriculum-library";
import { AcademyRequirementsApi } from "@/lib/academy/requirements";

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "The request could not be completed.";

interface CurriculumCompositionPanelProps {
  kind: CurriculumKind;
  definitionId: string;
  versions: CurriculumVersion[];
  onError: (msg: string) => void;
}

export function CurriculumCompositionPanel({
  kind,
  definitionId,
  versions,
  onError,
}: CurriculumCompositionPanelProps) {
  const [busy, setBusy] = useState(false);
  const [allSkills, setAllSkills] = useState<CatalogSkill[]>([]);
  const [linkedSkills, setLinkedSkills] = useState<LinkedSkill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");

  const [versionId, setVersionId] = useState("");
  const [lessonDrills, setLessonDrills] = useState<LessonDrillLink[]>([]);
  const [drillDefs, setDrillDefs] = useState<CurriculumDefinition[]>([]);
  const [drillDefId, setDrillDefId] = useState("");
  const [drillVersions, setDrillVersions] = useState<CurriculumVersion[]>([]);
  const [drillVersionId, setDrillVersionId] = useState("");
  const [drillOrder, setDrillOrder] = useState("0");
  const [drillSets, setDrillSets] = useState("3");
  const [drillDist, setDrillDist] = useState("");

  const [modComp, setModComp] = useState<ModuleComposition | null>(null);
  const [lessonDefs, setLessonDefs] = useState<CurriculumDefinition[]>([]);
  const [lessonDefId, setLessonDefId] = useState("");
  const [lessonVersions, setLessonVersions] = useState<CurriculumVersion[]>([]);
  const [lessonVersionId, setLessonVersionId] = useState("");
  const [modLessonOrder, setModLessonOrder] = useState("0");
  const [quizDefs, setQuizDefs] = useState<CurriculumDefinition[]>([]);
  const [quizDefId, setQuizDefId] = useState("");
  const [quizVersions, setQuizVersions] = useState<CurriculumVersion[]>([]);
  const [quizVersionId, setQuizVersionId] = useState("");

  useEffect(() => {
    setVersionId((prev) =>
      versions.some((v) => v.id === prev) ? prev : versions[0]?.id || "",
    );
  }, [versions]);

  useEffect(() => {
    if (kind !== "milestone" && kind !== "drill") return;
    CurriculumLibraryApi.listSkills()
      .then((skills) => {
        setAllSkills(skills);
        if (skills[0]) setSelectedSkillId((prev) => prev || skills[0].id);
      })
      .catch(() => {});
  }, [kind]);

  useEffect(() => {
    if (kind !== "milestone" && kind !== "drill") {
      setLinkedSkills([]);
      return;
    }
    const entity = kind === "milestone" ? "milestones" : "drills";
    CurriculumLibraryApi.listEntitySkills(entity, definitionId)
      .then(setLinkedSkills)
      .catch(() => setLinkedSkills([]));
  }, [kind, definitionId]);

  useEffect(() => {
    if (kind === "lesson") {
      CurriculumLibraryApi.definitions("drill")
        .then((items) => {
          setDrillDefs(items);
          setDrillDefId((prev) => prev || items[0]?.id || "");
        })
        .catch(() => {});
    } else if (kind === "module") {
      Promise.all([
        CurriculumLibraryApi.definitions("lesson"),
        CurriculumLibraryApi.definitions("quiz"),
      ])
        .then(([lessons, quizzes]) => {
          setLessonDefs(lessons);
          setQuizDefs(quizzes);
          setLessonDefId((prev) => prev || lessons[0]?.id || "");
          setQuizDefId((prev) => prev || quizzes[0]?.id || "");
        })
        .catch(() => {});
    }
  }, [kind]);

  useEffect(() => {
    if (!drillDefId) return;
    CurriculumLibraryApi.versions("drill", drillDefId)
      .then((vers) => {
        const pub = vers.filter((v) => v.state === "published");
        setDrillVersions(pub);
        setDrillVersionId(pub[0]?.id || "");
      })
      .catch(() => {});
  }, [drillDefId]);

  useEffect(() => {
    if (!lessonDefId) return;
    CurriculumLibraryApi.versions("lesson", lessonDefId)
      .then((vers) => {
        const pub = vers.filter((v) => v.state === "published");
        setLessonVersions(pub);
        setLessonVersionId(pub[0]?.id || "");
      })
      .catch(() => {});
  }, [lessonDefId]);

  useEffect(() => {
    if (!quizDefId) return;
    CurriculumLibraryApi.versions("quiz", quizDefId)
      .then((vers) => {
        const pub = vers.filter((v) => v.state === "published");
        setQuizVersions(pub);
        setQuizVersionId(pub[0]?.id || "");
      })
      .catch(() => {});
  }, [quizDefId]);

  const reload = useCallback(async () => {
    if (!versionId) return;
    try {
      if (kind === "lesson") {
        setLessonDrills(await CurriculumLibraryApi.listLessonDrills(versionId));
      } else if (kind === "module") {
        setModComp(await CurriculumLibraryApi.getModuleComposition(versionId));
      }
    } catch {
      setLessonDrills([]);
      setModComp(null);
    }
  }, [kind, versionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const runAction = async (fn: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
    } catch (err) {
      onError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedVersion = versions.find((v) => v.id === versionId);

  if (kind === "milestone" || kind === "drill") {
    const entity = kind === "milestone" ? "milestones" : "drills";
    return (
      <div className="space-y-4">
        <div className="space-y-2 rounded-xl border border-slate-200 p-4">
          <h3 className="text-base font-semibold text-slate-900">Linked canonical skills</h3>
          <div className="flex flex-wrap gap-2">
            {linkedSkills.map((link) => (
              <span
                key={link.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800"
              >
                {link.name ?? link.skill_id}
                {link.category ? ` (${link.category})` : ""}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void runAction(async () => {
                      await CurriculumLibraryApi.removeEntitySkill(entity, definitionId, link.id);
                      setLinkedSkills((prev) => prev.filter((i) => i.id !== link.id));
                    }, "Skill unlinked")
                  }
                  className="text-slate-500 hover:text-rose-700"
                >
                  ×
                </button>
              </span>
            ))}
            {linkedSkills.length === 0 && (
              <p className="text-xs text-slate-500">No skills linked yet.</p>
            )}
          </div>
          {allSkills.length > 0 && (
            <div className="flex flex-wrap items-end gap-2 pt-1">
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {allSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name} ({skill.category})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy || !selectedSkillId}
                onClick={() =>
                  void runAction(async () => {
                    await CurriculumLibraryApi.attachEntitySkill(entity, definitionId, selectedSkillId);
                    setLinkedSkills(await CurriculumLibraryApi.listEntitySkills(entity, definitionId));
                  }, "Skill linked")
                }
              >
                Link skill
              </Button>
            </div>
          )}
        </div>
        {kind === "milestone" && (
          <MilestoneRemedialDrillsPanel
            milestoneDefinitionId={definitionId}
            onError={onError}
          />
        )}
      </div>
    );
  }

  if (kind === "lesson" && versions.length > 0) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">Lesson drills progression</h3>
          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} ({v.state})
              </option>
            ))}
          </select>
        </div>
        {lessonDrills.length === 0 ? (
          <p className="text-xs text-slate-500">No drills attached yet.</p>
        ) : (
          <ul className="space-y-2">
            {lessonDrills.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    #{item.order_index + 1} · {item.drill_title ?? item.drill_code} (v{item.drill_version})
                  </p>
                  <p className="text-slate-600">
                    {item.sets} sets{item.distance_m ? ` × ${item.distance_m}m` : ""} ·{" "}
                    {item.focal_cue_override || item.primary_focal_cue}
                  </p>
                </div>
                {selectedVersion?.state === "draft" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void runAction(async () => {
                        await CurriculumLibraryApi.removeLessonDrill(versionId, item.id);
                        await reload();
                      }, "Drill removed")
                    }
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {selectedVersion?.state === "draft" && (
          <div className="grid gap-2 border-t border-slate-200 pt-3 md:grid-cols-2">
            <select
              value={drillDefId}
              onChange={(e) => setDrillDefId(e.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
            >
              {drillDefs.length === 0 && <option value="">No drills in library</option>}
              {drillDefs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.code})
                </option>
              ))}
            </select>
            <select
              value={drillVersionId}
              onChange={(e) => setDrillVersionId(e.target.value)}
              className="min-h-10 rounded-lg border border-slate-300 px-2.5 py-2 text-xs"
            >
              {drillVersions.length === 0 && <option value="">No published version</option>}
              {drillVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  Published v{v.version}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Input label="Order" name="drill-order" type="number" min="0" value={drillOrder} onChange={(e) => setDrillOrder(e.target.value)} />
              <Input label="Sets" name="drill-sets" type="number" min="1" value={drillSets} onChange={(e) => setDrillSets(e.target.value)} />
              <Input label="Dist (m)" name="drill-dist" type="number" min="1" value={drillDist} onChange={(e) => setDrillDist(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="sm"
                disabled={busy || !drillVersionId}
                onClick={() =>
                  void runAction(async () => {
                    await CurriculumLibraryApi.attachLessonDrill(versionId, {
                      drill_version_id: drillVersionId,
                      order_index: Number(drillOrder),
                      sets: Math.max(1, Number(drillSets) || 1),
                      distance_m: drillDist.trim() ? Number(drillDist) : null,
                    });
                    await reload();
                  }, "Drill attached")
                }
              >
                Attach drill
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (kind === "module" && versions.length > 0 && modComp) {
    const isDraft = modComp.state === "draft";
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 p-4 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-slate-900">Module composition</h3>
          <select
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} ({v.state})
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1 font-semibold text-slate-800">Lessons ({modComp.lessons.length})</p>
          {modComp.lessons.map((l) => (
            <div key={l.id} className="mb-1 flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
              <span>#{l.order_index + 1} · {l.title ?? l.code} (v{l.version})</span>
              {isDraft && (
                <button type="button" onClick={() => void runAction(async () => { await CurriculumLibraryApi.removeModuleLesson(versionId, l.id); await reload(); }, "Lesson removed")} className="font-medium text-rose-700 hover:underline">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 font-semibold text-slate-800">Milestones ({modComp.milestones.length})</p>
          {modComp.milestones.map((m) => (
            <div key={m.id} className="mb-1 flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
              <span>{m.title ?? m.code} (v{m.version}){m.safety_gate ? " · Safety gate" : ""}</span>
              {isDraft && (
                <button type="button" onClick={() => void runAction(async () => { await AcademyRequirementsApi.removeModuleMilestone(versionId, m.id); await reload(); }, "Milestone removed")} className="font-medium text-rose-700 hover:underline">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div>
          <p className="mb-1 font-semibold text-slate-800">Knowledge quizzes ({modComp.quizzes.length})</p>
          {modComp.quizzes.map((q) => (
            <div key={q.id} className="mb-1 flex items-center justify-between rounded border border-slate-200 px-2.5 py-1.5">
              <span>{q.title ?? q.code} (v{q.version})</span>
              {isDraft && (
                <button type="button" onClick={() => void runAction(async () => { await CurriculumLibraryApi.removeModuleQuiz(versionId, q.id); await reload(); }, "Quiz removed")} className="font-medium text-rose-700 hover:underline">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {isDraft && (
          <div className="grid gap-3 border-t border-slate-200 pt-3 md:grid-cols-2">
            <div className="space-y-2">
              <p className="font-semibold text-slate-800">Attach published lesson</p>
              <select value={lessonDefId} onChange={(e) => setLessonDefId(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5">
                {lessonDefs.map((item) => (<option key={item.id} value={item.id}>{item.title} ({item.code})</option>))}
              </select>
              <div className="flex gap-2">
                <select value={lessonVersionId} onChange={(e) => setLessonVersionId(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5">
                  {lessonVersions.length === 0 && <option value="">No published version</option>}
                  {lessonVersions.map((v) => (<option key={v.id} value={v.id}>v{v.version}</option>))}
                </select>
                <input type="number" min="0" value={modLessonOrder} onChange={(e) => setModLessonOrder(e.target.value)} className="w-20 rounded border border-slate-300 px-2 py-1.5" />
              </div>
              <Button type="button" size="sm" variant="secondary" disabled={busy || !lessonVersionId} onClick={() => void runAction(async () => { await CurriculumLibraryApi.attachModuleLesson(versionId, { lesson_version_id: lessonVersionId, order_index: Number(modLessonOrder) }); await reload(); }, "Lesson attached")}>
                Add lesson
              </Button>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-800">Attach published quiz</p>
              <select value={quizDefId} onChange={(e) => setQuizDefId(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5">
                {quizDefs.map((item) => (<option key={item.id} value={item.id}>{item.title} ({item.code})</option>))}
              </select>
              <select value={quizVersionId} onChange={(e) => setQuizVersionId(e.target.value)} className="w-full rounded border border-slate-300 px-2 py-1.5">
                {quizVersions.length === 0 && <option value="">No published version</option>}
                {quizVersions.map((v) => (<option key={v.id} value={v.id}>v{v.version}</option>))}
              </select>
              <Button type="button" size="sm" variant="secondary" disabled={busy || !quizVersionId} onClick={() => void runAction(async () => { await CurriculumLibraryApi.attachModuleQuiz(versionId, { quiz_version_id: quizVersionId, required_for_completion: true }); await reload(); }, "Quiz attached")}>
                Add quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
