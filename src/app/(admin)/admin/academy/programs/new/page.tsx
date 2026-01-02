"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { AcademyApi, ProgramLevel, BillingType, MilestoneType, RequiredEvidence, type Milestone } from "@/lib/academy";
import { toast } from "sonner";

interface CurriculumWeek {
    week: number;
    topics: string[];
}

interface MilestoneFormItem {
    id: string;
    name: string;
    description: string;
    criteria: string;
    order_index: number;
    milestone_type: MilestoneType;
    required_evidence: RequiredEvidence;
}

export default function NewProgramPage() {
    const router = useRouter();
    const [step, setStep] = useState<"basics" | "curriculum" | "milestones" | "review">("basics");
    const [saving, setSaving] = useState(false);

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
        prep_materials: "",
    });

    // Curriculum state
    const [curriculum, setCurriculum] = useState<CurriculumWeek[]>([
        { week: 1, topics: [""] }
    ]);

    // Milestones state
    const [milestones, setMilestones] = useState<MilestoneFormItem[]>([]);

    // --- Curriculum Helpers ---
    const addWeek = () => {
        setCurriculum([...curriculum, { week: curriculum.length + 1, topics: [""] }]);
    };

    const removeWeek = (weekIndex: number) => {
        if (curriculum.length > 1) {
            const updated = curriculum.filter((_, i) => i !== weekIndex);
            // Re-number weeks
            updated.forEach((w, i) => w.week = i + 1);
            setCurriculum(updated);
        }
    };

    const addTopic = (weekIndex: number) => {
        const updated = [...curriculum];
        updated[weekIndex].topics.push("");
        setCurriculum(updated);
    };

    const updateTopic = (weekIndex: number, topicIndex: number, value: string) => {
        const updated = [...curriculum];
        updated[weekIndex].topics[topicIndex] = value;
        setCurriculum(updated);
    };

    const removeTopic = (weekIndex: number, topicIndex: number) => {
        const updated = [...curriculum];
        if (updated[weekIndex].topics.length > 1) {
            updated[weekIndex].topics.splice(topicIndex, 1);
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
        // Re-order
        updated.forEach((m, i) => m.order_index = i + 1);
        setMilestones(updated);
    };

    // --- Convert curriculum to JSON ---
    const buildCurriculumJson = () => {
        const result: Record<string, string[]> = {};
        curriculum.forEach((week) => {
            const topics = week.topics.filter(t => t.trim());
            if (topics.length > 0) {
                result[`week${week.week}`] = topics;
            }
        });
        return Object.keys(result).length > 0 ? result : null;
    };

    // --- Submit ---
    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error("Program name is required");
            return;
        }

        setSaving(true);
        try {
            // 1. Create the program
            const program = await AcademyApi.createProgram({
                ...formData,
                curriculum_json: buildCurriculumJson(),
            });

            // 2. Create milestones
            for (const milestone of milestones) {
                if (!milestone.name.trim()) continue;
                await AcademyApi.createMilestone({
                    program_id: program.id,
                    name: milestone.name,
                    criteria: milestone.criteria || milestone.description || undefined,
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
                                    Price (smallest unit)
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={formData.price_amount}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData({ ...formData, price_amount: value === '' ? 0 : parseInt(value) });
                                    }}
                                    placeholder="e.g., 5000000 for ₦50,000"
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    ₦{(formData.price_amount / 100).toLocaleString()} (display value)
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-semibold text-slate-900 mb-3">Additional Details</h3>

                            <Input
                                label="Cover Image URL"
                                value={formData.cover_image_url}
                                onChange={(e) => setFormData({ ...formData, cover_image_url: e.target.value })}
                                placeholder="https://... (optional banner image)"
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
                                <p className="text-sm text-slate-600">Define what topics are covered each week</p>
                            </div>
                            <Button variant="outline" onClick={addWeek}>
                                + Add Week
                            </Button>
                        </div>

                        {curriculum.map((week, weekIndex) => (
                            <div key={week.week} className="border rounded-lg p-4 space-y-3">
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

                                {week.topics.map((topic, topicIndex) => (
                                    <div key={topicIndex} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={topic}
                                            onChange={(e) => updateTopic(weekIndex, topicIndex, e.target.value)}
                                            placeholder={`Topic ${topicIndex + 1}`}
                                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
                                        />
                                        {week.topics.length > 1 && (
                                            <button
                                                onClick={() => removeTopic(weekIndex, topicIndex)}
                                                className="text-red-500 hover:text-red-700 text-xl"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <button
                                    onClick={() => addTopic(weekIndex)}
                                    className="text-sm text-cyan-600 hover:text-cyan-800"
                                >
                                    + Add Topic
                                </button>
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
                                    {curriculum.map((week) => (
                                        <div key={week.week} className="mb-2">
                                            <span className="font-medium">Week {week.week}:</span>{" "}
                                            {week.topics.filter(t => t.trim()).join(", ") || "No topics"}
                                        </div>
                                    ))}
                                </div>
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
