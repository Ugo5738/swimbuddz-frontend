"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { MediaInput } from "@/components/ui/MediaInput";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AcademyApi, BillingType, MilestoneType, ProgramLevel, RequiredEvidence, type Skill } from "@/lib/academy";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Curriculum lesson with full details including skills
interface CurriculumLesson {
    id: string;
    title: string;
    description: string;
    duration_minutes: number;
    video_url: string;
    skill_ids: string[]; // Now includes skills!
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

export default function NewProgramPage() {
    const router = useRouter();
    const [step, setStep] = useState<"basics" | "curriculum" | "milestones" | "review">("basics");
    const [saving, setSaving] = useState(false);

    // Skills library - loaded from backend
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loadingSkills, setLoadingSkills] = useState(true);

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

    // Curriculum state - now with skill_ids
    const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([
        {
            week: 1,
            theme: "",
            objectives: "",
            lessons: [{ id: `lesson-${Date.now()}`, title: "", description: "", duration_minutes: 60, video_url: "", skill_ids: [] }]
        }
    ]);

    // Milestones state
    const [milestones, setMilestones] = useState<MilestoneFormItem[]>([]);

    // Load skills on mount
    useEffect(() => {
        async function loadSkills() {
            try {
                const skillsData = await AcademyApi.listSkills();
                setSkills(skillsData);
            } catch (error) {
                console.error("Failed to load skills", error);
            } finally {
                setLoadingSkills(false);
            }
        }
        loadSkills();
    }, []);

    // --- Curriculum Helpers ---
    const addWeek = () => {
        setCurriculum([
            ...curriculum,
            {
                week: curriculum.length + 1,
                theme: "",
                objectives: "",
                lessons: [{ id: `lesson-${Date.now()}`, title: "", description: "", duration_minutes: 60, video_url: "", skill_ids: [] }]
            }
        ]);
    };

    const removeWeek = (weekIndex: number) => {
        if (curriculum.length > 1) {
            const updated = curriculum.filter((_, i) => i !== weekIndex);
            updated.forEach((w, i) => w.week = i + 1);
            setCurriculum(updated);
        }
    };

    const updateWeekField = (weekIndex: number, field: "theme" | "objectives", value: string) => {
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
            skill_ids: []
        });
        setCurriculum(updated);
    };

    const updateLesson = (weekIndex: number, lessonIndex: number, field: keyof CurriculumLesson, value: string | number | string[]) => {
        const updated = [...curriculum];
        (updated[weekIndex].lessons[lessonIndex] as any)[field] = value;
        setCurriculum(updated);
    };

    const toggleLessonSkill = (weekIndex: number, lessonIndex: number, skillId: string) => {
        const updated = [...curriculum];
        const lesson = updated[weekIndex].lessons[lessonIndex];
        if (lesson.skill_ids.includes(skillId)) {
            lesson.skill_ids = lesson.skill_ids.filter(id => id !== skillId);
        } else {
            lesson.skill_ids = [...lesson.skill_ids, skillId];
        }
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
            }
        ]);
    };

    const updateMilestone = (index: number, field: keyof MilestoneFormItem, value: string | number) => {
        const updated = [...milestones];
        (updated[index] as any)[field] = value;
        setMilestones(updated);
    };

    const removeMilestone = (index: number) => {
        const updated = milestones.filter((_, i) => i !== index);
        updated.forEach((m, i) => m.order_index = i + 1);
        setMilestones(updated);
    };

    // --- Submit (Now uses curriculum API for dual storage) ---
    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Program name is required");
            return;
        }

        setSaving(true);
        try {
            // 1. Create the program (no curriculum_json initially)
            // Exclude cover_image_url (read-only field, resolved from media_id)
            const { cover_image_url, ...createData } = formData;

            const program = await AcademyApi.createProgram({
                ...createData,
                price_amount: formData.price_amount,
                prep_materials: formData.prep_materials.trim() ? { content: formData.prep_materials } : null,
                curriculum_json: null, // Will be populated by curriculum API
            });

            // 2. Create curriculum using the new API (dual storage)
            const validWeeks = curriculum.filter(w => w.theme.trim() || w.lessons.some(l => l.title.trim()));

            if (validWeeks.length > 0) {
                // Create curriculum version
                const curriculumData = await AcademyApi.createCurriculum(program.id);

                // Add each week and its lessons
                for (const weekData of validWeeks) {
                    const week = await AcademyApi.addWeek(curriculumData.id, {
                        week_number: weekData.week,
                        theme: weekData.theme,
                        objectives: weekData.objectives,
                    });

                    // Add lessons to this week
                    for (const lessonData of weekData.lessons) {
                        if (!lessonData.title.trim()) continue;

                        await AcademyApi.addLesson(week.id, {
                            title: lessonData.title,
                            description: lessonData.description || undefined,
                            duration_minutes: lessonData.duration_minutes || undefined,
                            video_url: lessonData.video_url || undefined,
                            skill_ids: lessonData.skill_ids.length > 0 ? lessonData.skill_ids : undefined,
                        });
                    }
                }
            }

            // 3. Create milestones
            for (const milestone of milestones) {
                if (!milestone.name.trim()) continue;
                await AcademyApi.createMilestone({
                    program_id: program.id,
                    name: milestone.name,
                    criteria: milestone.criteria || milestone.description || undefined,
                    video_media_id: milestone.video_media_id || undefined,
                    order_index: milestone.order_index,
                    milestone_type: milestone.milestone_type,
                    required_evidence: milestone.required_evidence,
                });
            }

            toast.success("Program created successfully!");
            router.push(`/admin/academy/programs/${program.id}`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to create program");
        } finally {
            setSaving(false);
        }
    };

    const stepLabels = ["Basic Info", "Curriculum", "Milestones", "Review"];
    const currentStepIndex = ["basics", "curriculum", "milestones", "review"].indexOf(step);

    // Group skills by category for display
    const skillsByCategory = skills.reduce((acc, skill) => {
        if (!acc[skill.category]) acc[skill.category] = [];
        acc[skill.category].push(skill);
        return acc;
    }, {} as Record<string, Skill[]>);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.push("/admin/academy")}
                        className="text-sm text-slate-500 hover:text-slate-900 mb-2"
                    >
                        ← Back to Academy
                    </button>
                    <h1 className="text-3xl font-bold text-slate-900">Create New Program</h1>
                </div>
            </header>

            {/* Step Indicator */}
            <div className="flex gap-2">
                {stepLabels.map((label, i) => (
                    <div
                        key={label}
                        className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-medium transition-colors ${i === currentStepIndex
                            ? "bg-cyan-600 text-white"
                            : i < currentStepIndex
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <Card className="p-6">
                {step === "basics" && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Basic Information</h2>

                        <Input
                            label="Program Name *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Learn to Swim - Beginner"
                            required
                        />

                        <Textarea
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what students will learn..."
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Level"
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value as ProgramLevel })}
                            >
                                {Object.values(ProgramLevel).map((level) => (
                                    <option key={level} value={level}>
                                        {level.replace("_", " ").toUpperCase()}
                                    </option>
                                ))}
                            </Select>

                            <Input
                                label="Duration (Weeks)"
                                type="number"
                                min={1}
                                value={formData.duration_weeks}
                                onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) || 4 })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Default Capacity"
                                type="number"
                                min={1}
                                value={formData.default_capacity}
                                onChange={(e) => setFormData({ ...formData, default_capacity: parseInt(e.target.value) || 10 })}
                            />

                            <Select
                                label="Billing Type"
                                value={formData.billing_type}
                                onChange={(e) => setFormData({ ...formData, billing_type: e.target.value as BillingType })}
                            >
                                <option value={BillingType.ONE_TIME}>One-Time</option>
                                <option value={BillingType.SUBSCRIPTION}>Subscription</option>
                                <option value={BillingType.PER_SESSION}>Per Session</option>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Currency"
                                value={formData.currency}
                                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="NGN">NGN (₦)</option>
                                <option value="USD">USD ($)</option>
                                <option value="GBP">GBP (£)</option>
                            </Select>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Price (₦)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formData.price_amount === 0 ? "" : formData.price_amount}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, price_amount: value === '' ? 0 : parseInt(value) });
                                    }}
                                    placeholder="e.g., 50000"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    ₦{formData.price_amount.toLocaleString()} (display value)
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold text-slate-900 mb-3">Additional Details</h3>

                            <MediaInput
                                label="Cover Image"
                                purpose="cover_image"
                                mode="both"
                                value={formData.cover_image_media_id || null}
                                onChange={(mediaId, fileUrl) => setFormData({
                                    ...formData,
                                    cover_image_media_id: mediaId || "",
                                    cover_image_url: fileUrl || ""
                                })}
                            />

                            <Textarea
                                label="Prep Materials"
                                value={formData.prep_materials}
                                onChange={(e) => setFormData({ ...formData, prep_materials: e.target.value })}
                                placeholder="What students should prepare before starting (optional)..."
                                className="mt-4"
                            />
                        </div>
                    </div>
                )}

                {step === "curriculum" && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Curriculum</h2>
                                <p className="text-sm text-slate-600">Define weekly themes, objectives, lessons, and skills</p>
                            </div>
                            <Button variant="outline" onClick={addWeek}>
                                + Add Week
                            </Button>
                        </div>

                        {/* Skills info banner */}
                        {skills.length > 0 && (
                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                                <p className="text-sm text-cyan-800">
                                    <strong>Skills Library:</strong> {skills.length} skills available. Tag lessons with skills to track student progress.
                                </p>
                            </div>
                        )}

                        {curriculum.map((week, weekIndex) => (
                            <div key={week.week} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900">Week {week.week}</h3>
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
                                        onChange={(e) => updateWeekField(weekIndex, "theme", e.target.value)}
                                        placeholder="e.g., Water Confidence"
                                    />
                                    <Input
                                        label="Objectives"
                                        value={week.objectives}
                                        onChange={(e) => updateWeekField(weekIndex, "objectives", e.target.value)}
                                        placeholder="e.g., Floating, breathing basics"
                                    />
                                </div>

                                {/* Lessons */}
                                <div className="border-t pt-3 mt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium text-slate-700">Lessons</h4>
                                        <button
                                            onClick={() => addLesson(weekIndex)}
                                            className="text-sm text-cyan-600 hover:text-cyan-800"
                                        >
                                            + Add Lesson
                                        </button>
                                    </div>

                                    {week.lessons.map((lesson, lessonIndex) => (
                                        <div key={lesson.id} className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">Lesson {lessonIndex + 1}</span>
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
                                                    onChange={(e) => updateLesson(weekIndex, lessonIndex, "title", e.target.value)}
                                                    placeholder="Lesson title"
                                                />
                                                <Input
                                                    label="Duration (min)"
                                                    type="number"
                                                    value={lesson.duration_minutes}
                                                    onChange={(e) => updateLesson(weekIndex, lessonIndex, "duration_minutes", parseInt(e.target.value) || 60)}
                                                />
                                            </div>
                                            <Textarea
                                                label="Description"
                                                value={lesson.description}
                                                onChange={(e) => updateLesson(weekIndex, lessonIndex, "description", e.target.value)}
                                                placeholder="What will be covered in this lesson..."
                                            />
                                            <Input
                                                label="Model Video URL"
                                                value={lesson.video_url}
                                                onChange={(e) => updateLesson(weekIndex, lessonIndex, "video_url", e.target.value)}
                                                placeholder="https://... (instructional video)"
                                            />

                                            {/* Skills Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                                    Skills (click to tag)
                                                </label>
                                                {loadingSkills ? (
                                                    <p className="text-xs text-slate-500">Loading skills...</p>
                                                ) : skills.length === 0 ? (
                                                    <p className="text-xs text-slate-500">
                                                        No skills in library yet. Create skills in any program&apos;s{" "}
                                                        <span className="text-cyan-600 font-medium">Curriculum Builder → Skills Library</span>{" "}
                                                        sidebar after creating this program.
                                                    </p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-1">
                                                        {skills.map(skill => (
                                                            <button
                                                                key={skill.id}
                                                                type="button"
                                                                onClick={() => toggleLessonSkill(weekIndex, lessonIndex, skill.id)}
                                                                className={`px-2 py-1 rounded text-xs transition-colors ${lesson.skill_ids.includes(skill.id)
                                                                    ? "bg-cyan-600 text-white"
                                                                    : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                                    }`}
                                                            >
                                                                {skill.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
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
                                <h2 className="text-xl font-semibold text-slate-900">Milestones</h2>
                                <p className="text-sm text-slate-600">Define achievement checkpoints for students</p>
                            </div>
                            <Button variant="outline" onClick={addMilestone}>
                                + Add Milestone
                            </Button>
                        </div>

                        {milestones.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <p>No milestones defined yet.</p>
                                <button
                                    onClick={addMilestone}
                                    className="mt-2 text-cyan-600 hover:text-cyan-800"
                                >
                                    Add your first milestone
                                </button>
                            </div>
                        ) : (
                            milestones.map((milestone, index) => (
                                <div key={milestone.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-700">Milestone #{milestone.order_index}</span>
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
                                        onChange={(e) => updateMilestone(index, "name", e.target.value)}
                                        placeholder="e.g., Water Confidence"
                                    />

                                    <Textarea
                                        label="Description"
                                        value={milestone.description}
                                        onChange={(e) => updateMilestone(index, "description", e.target.value)}
                                        placeholder="Describe this milestone..."
                                    />

                                    <Textarea
                                        label="Criteria (how to assess)"
                                        value={milestone.criteria}
                                        onChange={(e) => updateMilestone(index, "criteria", e.target.value)}
                                        placeholder="What needs to be demonstrated..."
                                    />

                                    <MediaInput
                                        label="Demo Video (Optional)"
                                        purpose="milestone_video"
                                        mode="both"
                                        value={milestone.video_media_id || null}
                                        onChange={(mediaId) => updateMilestone(index, "video_media_id", mediaId || "")}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <Select
                                            label="Type"
                                            value={milestone.milestone_type}
                                            onChange={(e) => updateMilestone(index, "milestone_type", e.target.value)}
                                        >
                                            <option value={MilestoneType.SKILL}>Skill</option>
                                            <option value={MilestoneType.ENDURANCE}>Endurance</option>
                                            <option value={MilestoneType.TECHNIQUE}>Technique</option>
                                            <option value={MilestoneType.ASSESSMENT}>Assessment</option>
                                        </Select>

                                        <Select
                                            label="Required Evidence"
                                            value={milestone.required_evidence}
                                            onChange={(e) => updateMilestone(index, "required_evidence", e.target.value)}
                                        >
                                            <option value={RequiredEvidence.NONE}>None</option>
                                            <option value={RequiredEvidence.VIDEO}>Video</option>
                                            <option value={RequiredEvidence.TIME_TRIAL}>Time Trial</option>
                                        </Select>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {step === "review" && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold text-slate-900">Review & Create</h2>

                        <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">Basic Info</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><span className="text-slate-500">Name:</span> {formData.name || "—"}</div>
                                    <div><span className="text-slate-500">Level:</span> {formData.level}</div>
                                    <div><span className="text-slate-500">Duration:</span> {formData.duration_weeks} weeks</div>
                                    <div><span className="text-slate-500">Price:</span> {formData.currency} {formData.price_amount}</div>
                                </div>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">Curriculum</h3>
                                <div className="text-sm">
                                    {curriculum.map((week) => {
                                        const lessonCount = week.lessons.filter(l => l.title.trim()).length;
                                        const skillCount = week.lessons.reduce((sum, l) => sum + l.skill_ids.length, 0);
                                        return (
                                            <div key={week.week} className="mb-2">
                                                <span className="font-medium">Week {week.week}:</span>{" "}
                                                {week.theme || "No theme"} - {lessonCount} lesson(s)
                                                {skillCount > 0 && <span className="text-cyan-600 ml-1">({skillCount} skills tagged)</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-cyan-600 mt-2">
                                    ✓ Curriculum will be saved to both normalized tables and JSON (dual storage)
                                </p>
                            </div>

                            <div className="border rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">Milestones ({milestones.length})</h3>
                                <div className="text-sm space-y-1">
                                    {milestones.length === 0 ? (
                                        <p className="text-slate-500">No milestones defined</p>
                                    ) : (
                                        milestones.map((m) => (
                                            <div key={m.id}>
                                                {m.order_index}. {m.name || "Unnamed"} ({m.milestone_type})
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
                        if (step === "curriculum") setStep("basics");
                        else if (step === "milestones") setStep("curriculum");
                        else if (step === "review") setStep("milestones");
                    }}
                    disabled={step === "basics"}
                >
                    ← Previous
                </Button>

                {step === "review" ? (
                    <Button onClick={handleSubmit} disabled={saving}>
                        {saving ? "Creating..." : "Create Program"}
                    </Button>
                ) : (
                    <Button
                        onClick={() => {
                            if (step === "basics") setStep("curriculum");
                            else if (step === "curriculum") setStep("milestones");
                            else if (step === "milestones") setStep("review");
                        }}
                    >
                        Next →
                    </Button>
                )}
            </div>
        </div>
    );
}
