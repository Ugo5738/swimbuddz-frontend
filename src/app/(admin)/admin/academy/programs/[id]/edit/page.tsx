"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  AcademyApi,
  BillingType,
  MilestoneType,
  ProgramLevel,
  RequiredEvidence,
} from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Curriculum lesson with full details
interface CurriculumLesson {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  video_url: string;
}

// Week with theme, objectives, and lessons
interface CurriculumWeek {
  week: number;
  theme: string;
  objectives: string;
  lessons: CurriculumLesson[];
}

interface MilestoneFormItem {
  id: string;
  name: string;
  description: string;
  criteria: string;
  video_media_id: string;
  order_index: number;
  milestone_type: MilestoneType;
  required_evidence: RequiredEvidence;
}

export default function EditProgramPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<
    "basics" | "curriculum" | "milestones" | "review"
  >("basics");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Basic info state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: ProgramLevel.BEGINNER_1,
    duration_weeks: 4,
    default_capacity: 10,
    currency: "NGN",
    price_amount: 0,
    billing_type: BillingType.ONE_TIME,
    is_published: false,
    cover_image_url: "",
    cover_image_media_id: "",
    prep_materials: "",
  });

  // Curriculum state
  const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([
    {
      week: 1,
      theme: "",
      objectives: "",
      lessons: [
        {
          id: `lesson-${Date.now()}`,
          title: "",
          description: "",
          duration_minutes: 60,
          video_url: "",
        },
      ],
    },
  ]);

  // Milestones state
  const [milestones, setMilestones] = useState<MilestoneFormItem[]>([]);

  // Load existing program data
  useEffect(() => {
    async function loadProgram() {
      try {
        const [program, existingMilestones] = await Promise.all([
          AcademyApi.getProgram(id),
          AcademyApi.listMilestones(id),
        ]);

        // Populate form data
        setFormData({
          name: program.name || "",
          description: program.description || "",
          level: program.level || ProgramLevel.BEGINNER_1,
          duration_weeks: program.duration_weeks || 4,
          default_capacity: program.default_capacity || 10,
          currency: program.currency || "NGN",
          price_amount: program.price_amount || 0, // Stored in naira
          billing_type: program.billing_type || BillingType.ONE_TIME,
          is_published: program.is_published || false,
          cover_image_url: program.cover_image_url || "",
          cover_image_media_id: program.cover_image_media_id || "",
          prep_materials: program.prep_materials
            ? JSON.stringify(program.prep_materials, null, 2)
            : "",
        });

        // Populate curriculum from curriculum_json
        if (
          program.curriculum_json?.weeks &&
          Array.isArray(program.curriculum_json.weeks)
        ) {
          const weeks: CurriculumWeek[] = program.curriculum_json.weeks.map(
            (w: any) => ({
              week: w.week,
              theme: w.theme || "",
              objectives: w.objectives || "",
              lessons: (w.lessons || []).map((l: any, i: number) => ({
                id: `lesson-${Date.now()}-${i}`,
                title: l.title || "",
                description: l.description || "",
                duration_minutes: l.duration_minutes || 60,
                video_url: l.video_url || "",
              })),
            }),
          );
          if (weeks.length > 0) setCurriculum(weeks);
        }

        // Populate milestones
        if (existingMilestones.length > 0) {
          setMilestones(
            existingMilestones.map((m) => ({
              id: m.id,
              name: m.name,
              description: "",
              criteria: m.criteria || "",
              video_media_id: m.video_media_id || "",
              order_index: m.order_index || 0,
              milestone_type: m.milestone_type || MilestoneType.SKILL,
              required_evidence: m.required_evidence || RequiredEvidence.NONE,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load program", error);
        toast.error("Failed to load program data");
        router.push("/admin/academy");
      } finally {
        setLoading(false);
      }
    }
    if (id) loadProgram();
  }, [id, router]);

  // --- Curriculum Helpers ---
  const addWeek = () => {
    setCurriculum([
      ...curriculum,
      {
        week: curriculum.length + 1,
        theme: "",
        objectives: "",
        lessons: [
          {
            id: `lesson-${Date.now()}`,
            title: "",
            description: "",
            duration_minutes: 60,
            video_url: "",
          },
        ],
      },
    ]);
  };

  const removeWeek = (weekIndex: number) => {
    if (curriculum.length > 1) {
      const updated = curriculum.filter((_, i) => i !== weekIndex);
      updated.forEach((w, i) => (w.week = i + 1));
      setCurriculum(updated);
    }
  };

  const updateWeekField = (
    weekIndex: number,
    field: "theme" | "objectives",
    value: string,
  ) => {
    const updated = [...curriculum];
    updated[weekIndex][field] = value;
    setCurriculum(updated);
  };

  const addLesson = (weekIndex: number) => {
    const updated = [...curriculum];
    updated[weekIndex].lessons.push({
      id: `lesson-${Date.now()}`,
      title: "",
      description: "",
      duration_minutes: 60,
      video_url: "",
    });
    setCurriculum(updated);
  };

  const updateLesson = (
    weekIndex: number,
    lessonIndex: number,
    field: keyof CurriculumLesson,
    value: string | number,
  ) => {
    const updated = [...curriculum];
    (updated[weekIndex].lessons[lessonIndex] as any)[field] = value;
    setCurriculum(updated);
  };

  const removeLesson = (weekIndex: number, lessonIndex: number) => {
    const updated = [...curriculum];
    if (updated[weekIndex].lessons.length > 1) {
      updated[weekIndex].lessons.splice(lessonIndex, 1);
      setCurriculum(updated);
    }
  };

  // --- Milestone Helpers ---
  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: `temp-${Date.now()}`,
        name: "",
        description: "",
        criteria: "",
        video_media_id: "",
        order_index: milestones.length + 1,
        milestone_type: MilestoneType.SKILL,
        required_evidence: RequiredEvidence.NONE,
      },
    ]);
  };

  const updateMilestone = (
    index: number,
    field: keyof MilestoneFormItem,
    value: string | number,
  ) => {
    const updated = [...milestones];
    (updated[index] as any)[field] = value;
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    const updated = milestones.filter((_, i) => i !== index);
    updated.forEach((m, i) => (m.order_index = i + 1));
    setMilestones(updated);
  };

  // --- Build curriculum JSON ---
  const buildCurriculumJson = () => {
    const weeks = curriculum
      .map((week) => ({
        week: week.week,
        theme: week.theme,
        objectives: week.objectives,
        lessons: week.lessons
          .filter((l) => l.title.trim())
          .map((l) => ({
            title: l.title,
            description: l.description,
            duration_minutes: l.duration_minutes,
            video_url: l.video_url || undefined,
          })),
      }))
      .filter(
        (w) => w.lessons.length > 0 || w.theme.trim() || w.objectives.trim(),
      );
    return weeks.length > 0 ? { weeks } : null;
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Program name is required");
      return;
    }

    setSaving(true);
    try {
      // Exclude cover_image_url (read-only field, resolved from media_id)
      const { cover_image_url, ...updateData } = formData;

      // Parse prep_materials JSON
      let prepMaterialsData = null;
      if (formData.prep_materials.trim()) {
        try {
          prepMaterialsData = JSON.parse(formData.prep_materials);
        } catch (e) {
          toast.error(
            "Invalid JSON in Prep Materials. Please fix syntax to save.",
          );
          setSaving(false);
          return;
        }
      }

      // Update the program
      await AcademyApi.updateProgram(id, {
        ...updateData,
        price_amount: formData.price_amount, // Stored in naira
        prep_materials: prepMaterialsData,
        curriculum_json: buildCurriculumJson(),
      });

      // For milestones: delete removed, update existing, create new
      // Simplified: just update what we have
      // TODO: implement proper milestone sync

      toast.success("Program updated successfully!");
      router.push(`/admin/academy/programs/${id}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update program");
    } finally {
      setSaving(false);
    }
  };

  const stepLabels = ["Basic Info", "Curriculum", "Milestones", "Review"];
  const currentStepIndex = [
    "basics",
    "curriculum",
    "milestones",
    "review",
  ].indexOf(step);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        Loading program data...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push(`/admin/academy/programs/${id}`)}
            className="text-sm text-slate-500 hover:text-slate-700 mb-1"
          >
            ← Back to Program
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Edit Program</h1>
        </div>
      </header>

      {/* Step Tabs */}
      <div className="flex gap-2">
        {stepLabels.map((label, idx) => (
          <button
            key={label}
            onClick={() =>
              setStep(
                ["basics", "curriculum", "milestones", "review"][idx] as any,
              )
            }
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              idx === currentStepIndex
                ? "bg-cyan-600 text-white"
                : idx < currentStepIndex
                  ? "bg-green-100 text-green-700"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        {step === "basics" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Basic Information
            </h2>
            <Input
              label="Program Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Level"
                value={formData.level}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    level: e.target.value as ProgramLevel,
                  })
                }
              >
                {Object.values(ProgramLevel).map((level) => (
                  <option key={level} value={level}>
                    {level.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              <Input
                label="Duration (weeks)"
                type="number"
                min={1}
                value={formData.duration_weeks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_weeks: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Default Capacity"
                type="number"
                min={1}
                value={formData.default_capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_capacity: parseInt(e.target.value) || 10,
                  })
                }
              />
              <Select
                label="Billing Type"
                value={formData.billing_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billing_type: e.target.value as BillingType,
                  })
                }
              >
                {Object.values(BillingType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Currency"
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </Select>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Price (₦)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.price_amount === 0 ? "" : formData.price_amount
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_amount:
                        parseInt(e.target.value.replace(/\D/g, "")) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  ₦{formData.price_amount.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                Additional Details
              </h3>
              <MediaInput
                label="Cover Image"
                purpose="cover_image"
                mode="both"
                value={formData.cover_image_media_id || null}
                onChange={(mediaId, fileUrl) =>
                  setFormData({
                    ...formData,
                    cover_image_media_id: mediaId || "",
                    cover_image_url: fileUrl || "",
                  })
                }
              />
              <Textarea
                label="Prep Materials"
                value={formData.prep_materials}
                onChange={(e) =>
                  setFormData({ ...formData, prep_materials: e.target.value })
                }
                placeholder="What students should prepare..."
                className="mt-4"
              />
            </div>
          </div>
        )}

        {step === "curriculum" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Curriculum
                </h2>
                <p className="text-sm text-slate-600">
                  Define weekly themes, objectives, and lessons
                </p>
              </div>
              <Button variant="outline" onClick={addWeek}>
                + Add Week
              </Button>
            </div>

            {curriculum.map((week, weekIndex) => (
              <div key={week.week} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">
                    Week {week.week}
                  </h3>
                  {curriculum.length > 1 && (
                    <button
                      onClick={() => removeWeek(weekIndex)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove Week
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Theme"
                    value={week.theme}
                    onChange={(e) =>
                      updateWeekField(weekIndex, "theme", e.target.value)
                    }
                    placeholder="e.g., Water Confidence"
                  />
                  <Input
                    label="Objectives"
                    value={week.objectives}
                    onChange={(e) =>
                      updateWeekField(weekIndex, "objectives", e.target.value)
                    }
                    placeholder="e.g., Floating, breathing"
                  />
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700">
                      Lessons
                    </h4>
                    <button
                      onClick={() => addLesson(weekIndex)}
                      className="text-sm text-cyan-600 hover:text-cyan-800"
                    >
                      + Add Lesson
                    </button>
                  </div>
                  {week.lessons.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          Lesson {lessonIndex + 1}
                        </span>
                        {week.lessons.length > 1 && (
                          <button
                            onClick={() => removeLesson(weekIndex, lessonIndex)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Title *"
                          value={lesson.title}
                          onChange={(e) =>
                            updateLesson(
                              weekIndex,
                              lessonIndex,
                              "title",
                              e.target.value,
                            )
                          }
                        />
                        <Input
                          label="Duration (min)"
                          type="number"
                          value={lesson.duration_minutes}
                          onChange={(e) =>
                            updateLesson(
                              weekIndex,
                              lessonIndex,
                              "duration_minutes",
                              parseInt(e.target.value) || 60,
                            )
                          }
                        />
                      </div>
                      <Textarea
                        label="Description"
                        value={lesson.description}
                        onChange={(e) =>
                          updateLesson(
                            weekIndex,
                            lessonIndex,
                            "description",
                            e.target.value,
                          )
                        }
                      />
                      <Input
                        label="Video URL"
                        value={lesson.video_url}
                        onChange={(e) =>
                          updateLesson(
                            weekIndex,
                            lessonIndex,
                            "video_url",
                            e.target.value,
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === "milestones" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Milestones
                </h2>
                <p className="text-sm text-slate-600">
                  Define achievement checkpoints
                </p>
              </div>
              <Button variant="outline" onClick={addMilestone}>
                + Add Milestone
              </Button>
            </div>
            {milestones.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No milestones. Click + Add Milestone to create one.
              </p>
            ) : (
              milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-slate-900">
                      Milestone #{index + 1}
                    </h3>
                    <button
                      onClick={() => removeMilestone(index)}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <Input
                    label="Name *"
                    value={milestone.name}
                    onChange={(e) =>
                      updateMilestone(index, "name", e.target.value)
                    }
                  />
                  <Textarea
                    label="Criteria"
                    value={milestone.criteria}
                    onChange={(e) =>
                      updateMilestone(index, "criteria", e.target.value)
                    }
                  />
                  <MediaInput
                    label="Demo Video"
                    purpose="milestone_video"
                    mode="both"
                    value={milestone.video_media_id || null}
                    onChange={(mediaId) =>
                      updateMilestone(index, "video_media_id", mediaId || "")
                    }
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select
                      label="Type"
                      value={milestone.milestone_type}
                      onChange={(e) =>
                        updateMilestone(index, "milestone_type", e.target.value)
                      }
                    >
                      {Object.values(MilestoneType).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </Select>
                    <Select
                      label="Required Evidence"
                      value={milestone.required_evidence}
                      onChange={(e) =>
                        updateMilestone(
                          index,
                          "required_evidence",
                          e.target.value,
                        )
                      }
                    >
                      {Object.values(RequiredEvidence).map((ev) => (
                        <option key={ev} value={ev}>
                          {ev}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {step === "review" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Review & Save
            </h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Basic Info
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-500">Name:</span>{" "}
                    {formData.name || "—"}
                  </div>
                  <div>
                    <span className="text-slate-500">Level:</span>{" "}
                    {formData.level}
                  </div>
                  <div>
                    <span className="text-slate-500">Duration:</span>{" "}
                    {formData.duration_weeks} weeks
                  </div>
                  <div>
                    <span className="text-slate-500">Price:</span> ₦
                    {formData.price_amount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Curriculum
                </h3>
                <div className="text-sm">
                  {curriculum.map((week) => (
                    <div key={week.week} className="mb-2">
                      <span className="font-medium">Week {week.week}:</span>{" "}
                      {week.theme || "No theme"} -{" "}
                      {week.lessons.filter((l) => l.title.trim()).length}{" "}
                      lesson(s)
                    </div>
                  ))}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Milestones ({milestones.length})
                </h3>
                <div className="text-sm space-y-1">
                  {milestones.length === 0 ? (
                    <p className="text-slate-500">No milestones defined</p>
                  ) : (
                    milestones.map((m, idx) => (
                      <div key={m.id}>
                        {idx + 1}. {m.name || "Unnamed"}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => {
            const steps = ["basics", "curriculum", "milestones", "review"];
            const idx = steps.indexOf(step);
            if (idx > 0) setStep(steps[idx - 1] as any);
            else router.push(`/admin/academy/programs/${id}`);
          }}
        >
          ← Previous
        </Button>
        {step === "review" ? (
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        ) : (
          <Button
            onClick={() => {
              const steps = ["basics", "curriculum", "milestones", "review"];
              const idx = steps.indexOf(step);
              if (idx < steps.length - 1) setStep(steps[idx + 1] as any);
            }}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}
