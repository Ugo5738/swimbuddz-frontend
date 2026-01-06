"use client";

import { Card } from "@/components/ui/Card";
import {
    AcademyApi,
    CurriculumLessonCreate,
    CurriculumWeek,
    CurriculumWeekCreate,
    Program,
    ProgramCurriculum,
    Skill,
    SkillCreate,
} from "@/lib/academy";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// DnD Kit imports
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Skill category options
const SKILL_CATEGORIES = [
    { value: "water_confidence", label: "Water Confidence" },
    { value: "stroke", label: "Stroke Technique" },
    { value: "safety", label: "Safety" },
    { value: "technique", label: "General Technique" },
];

// Custom Confirm Modal (replaces native window.confirm which has issues)
function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
}: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
            <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600 mb-6">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// Sortable Week Card Component
function SortableWeekCard({
    week,
    isExpanded,
    onToggleExpand,
    onDeleteWeek,
    children,
}: {
    week: CurriculumWeek;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onDeleteWeek: () => void;
    children: React.ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: week.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className="overflow-hidden">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Drag handle */}
                        <button
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
                            title="Drag to reorder"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="5" r="1.5" />
                                <circle cx="15" cy="5" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" />
                                <circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="19" r="1.5" />
                                <circle cx="15" cy="19" r="1.5" />
                            </svg>
                        </button>
                        <button
                            onClick={onToggleExpand}
                            className="flex items-center gap-2"
                        >
                            <span className="text-xl">
                                {isExpanded ? "▼" : "▶"}
                            </span>
                            <div className="text-left">
                                <h3 className="font-semibold text-slate-900">Week {week.week_number}: {week.theme}</h3>
                                <p className="text-sm text-slate-500">
                                    {week.lessons.length} lessons
                                    {week.objectives && ` • ${week.objectives}`}
                                </p>
                            </div>
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDeleteWeek();
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                    >
                        Delete
                    </button>
                </div>

                {isExpanded && children}
            </Card>
        </div>
    );
}

// Sortable Lesson Item Component
function SortableLessonItem({
    lesson,
    onDelete,
}: {
    lesson: { id: string; title: string; duration_minutes?: number; skills: { name: string }[] };
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lesson.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center justify-between bg-slate-50 rounded p-3"
        >
            <div className="flex items-center gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 p-1"
                    title="Drag to reorder"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="5" r="1.5" />
                        <circle cx="15" cy="5" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" />
                        <circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="19" r="1.5" />
                        <circle cx="15" cy="19" r="1.5" />
                    </svg>
                </button>
                <div>
                    <p className="font-medium text-slate-900">{lesson.title}</p>
                    <p className="text-xs text-slate-500">
                        {lesson.duration_minutes && `${lesson.duration_minutes} min`}
                        {lesson.skills.length > 0 && (
                            <span className="ml-2">
                                Skills: {lesson.skills.map(s => s.name).join(", ")}
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                }}
                className="text-red-500 hover:text-red-700 text-xs"
            >
                Delete
            </button>
        </div>
    );
}

export default function CurriculumBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const programId = params.id as string;

    const [program, setProgram] = useState<Program | null>(null);
    const [curriculum, setCurriculum] = useState<ProgramCurriculum | null>(null);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [showAddWeek, setShowAddWeek] = useState(false);
    const [showAddSkill, setShowAddSkill] = useState(false);
    const [expandedWeekIds, setExpandedWeekIds] = useState<Set<string>>(new Set());
    const [addingLessonToWeekId, setAddingLessonToWeekId] = useState<string | null>(null);

    // Week form
    const [newWeek, setNewWeek] = useState<CurriculumWeekCreate>({ week_number: 1, theme: "", objectives: "" });

    // Lesson form
    const [newLesson, setNewLesson] = useState<CurriculumLessonCreate>({ title: "", description: "", duration_minutes: 30, video_url: "", skill_ids: [] });

    // Skill form
    const [newSkill, setNewSkill] = useState<SkillCreate>({ name: "", category: "technique", description: "" });

    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: () => { },
    });

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmModal({ isOpen: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    useEffect(() => {
        loadData();
    }, [programId]);

    async function loadData() {
        setLoading(true);
        try {
            const [programData, skillsData] = await Promise.all([
                AcademyApi.getProgram(programId),
                AcademyApi.listSkills(),
            ]);
            setProgram(programData);
            setSkills(skillsData);

            // Try to load curriculum (may not exist)
            try {
                const curriculumData = await AcademyApi.getCurriculum(programId);
                setCurriculum(curriculumData);
            } catch {
                // No curriculum yet - that's ok
                setCurriculum(null);
            }
        } catch (error) {
            console.error("Failed to load data", error);
            toast.error("Failed to load program data");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateCurriculum() {
        try {
            const newCurriculum = await AcademyApi.createCurriculum(programId);
            setCurriculum(newCurriculum);
            toast.success("Curriculum created");
        } catch (error) {
            console.error("Failed to create curriculum", error);
            toast.error("Failed to create curriculum");
        }
    }

    async function handleAddWeek() {
        if (!curriculum || !newWeek.theme) return;
        try {
            await AcademyApi.addWeek(curriculum.id, newWeek);
            await loadData();
            setShowAddWeek(false);
            setNewWeek({ week_number: (curriculum.weeks.length || 0) + 1, theme: "", objectives: "" });
            toast.success("Week added");
        } catch (error) {
            console.error("Failed to add week", error);
            toast.error("Failed to add week");
        }
    }

    function handleDeleteWeek(weekId: string) {
        showConfirm(
            "Delete Week",
            "Delete this week and all its lessons?",
            async () => {
                closeConfirm();
                try {
                    await AcademyApi.deleteWeek(weekId);
                    await loadData();
                    toast.success("Week deleted");
                } catch (error) {
                    console.error("Failed to delete week", error);
                    toast.error("Failed to delete week");
                }
            }
        );
    }

    async function handleAddLesson(weekId: string) {
        if (!newLesson.title) return;
        try {
            await AcademyApi.addLesson(weekId, newLesson);
            await loadData();
            setAddingLessonToWeekId(null);
            setNewLesson({ title: "", description: "", duration_minutes: 30, video_url: "", skill_ids: [] });
            toast.success("Lesson added");
        } catch (error) {
            console.error("Failed to add lesson", error);
            toast.error("Failed to add lesson");
        }
    }

    function handleDeleteLesson(lessonId: string) {
        showConfirm(
            "Delete Lesson",
            "Delete this lesson?",
            async () => {
                closeConfirm();
                try {
                    await AcademyApi.deleteLesson(lessonId);
                    await loadData();
                    toast.success("Lesson deleted");
                } catch (error) {
                    console.error("Failed to delete lesson", error);
                    toast.error("Failed to delete lesson");
                }
            }
        );
    }

    async function handleAddSkill() {
        if (!newSkill.name) return;
        try {
            await AcademyApi.createSkill(newSkill);
            const updatedSkills = await AcademyApi.listSkills();
            setSkills(updatedSkills);
            setShowAddSkill(false);
            setNewSkill({ name: "", category: "technique", description: "" });
            toast.success("Skill added");
        } catch (error) {
            console.error("Failed to add skill", error);
            toast.error("Failed to add skill");
        }
    }

    function handleDeleteSkill(skillId: string) {
        showConfirm(
            "Delete Skill",
            "Delete this skill? It will be removed from all lessons.",
            async () => {
                closeConfirm();
                try {
                    await AcademyApi.deleteSkill(skillId);
                    const updatedSkills = await AcademyApi.listSkills();
                    setSkills(updatedSkills);
                    toast.success("Skill deleted");
                } catch (error) {
                    console.error("Failed to delete skill", error);
                    toast.error("Failed to delete skill");
                }
            }
        );
    }

    function toggleWeekExpansion(weekId: string) {
        setExpandedWeekIds(prev => {
            const next = new Set(prev);
            if (next.has(weekId)) {
                next.delete(weekId);
            } else {
                next.add(weekId);
            }
            return next;
        });
    }

    function toggleLessonSkill(skillId: string) {
        setNewLesson(prev => {
            const currentSkills = prev.skill_ids || [];
            if (currentSkills.includes(skillId)) {
                return { ...prev, skill_ids: currentSkills.filter(id => id !== skillId) };
            } else {
                return { ...prev, skill_ids: [...currentSkills, skillId] };
            }
        });
    }

    // Week drag-and-drop handler
    async function handleWeekDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id || !curriculum) return;

        const oldIndex = curriculum.weeks.findIndex(w => w.id === active.id);
        const newIndex = curriculum.weeks.findIndex(w => w.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistically update UI
        const newWeeks = arrayMove(curriculum.weeks, oldIndex, newIndex);
        setCurriculum({ ...curriculum, weeks: newWeeks });

        // Save to backend
        try {
            await AcademyApi.reorderWeeks(curriculum.id, newWeeks.map(w => w.id));
            toast.success("Weeks reordered");
        } catch (error) {
            console.error("Failed to reorder weeks", error);
            toast.error("Failed to reorder weeks");
            // Reload to get correct order
            await loadData();
        }
    }

    // Lesson drag-and-drop handler
    async function handleLessonDragEnd(weekId: string, event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id || !curriculum) return;

        const week = curriculum.weeks.find(w => w.id === weekId);
        if (!week) return;

        const oldIndex = week.lessons.findIndex(l => l.id === active.id);
        const newIndex = week.lessons.findIndex(l => l.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistically update UI
        const newLessons = arrayMove(week.lessons, oldIndex, newIndex);
        const newWeeks = curriculum.weeks.map(w =>
            w.id === weekId ? { ...w, lessons: newLessons } : w
        );
        setCurriculum({ ...curriculum, weeks: newWeeks });

        // Save to backend
        try {
            await AcademyApi.reorderLessons(weekId, newLessons.map(l => l.id));
            toast.success("Lessons reordered");
        } catch (error) {
            console.error("Failed to reorder lessons", error);
            toast.error("Failed to reorder lessons");
            await loadData();
        }
    }

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!program) {
        return <div className="p-6">Program not found</div>;
    }

    return (
        <>
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={closeConfirm}
            />

            <div className="space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <button onClick={() => router.push("/admin/academy")} className="hover:text-slate-900">
                                Academy
                            </button>
                            <span>/</span>
                            <button onClick={() => router.push(`/admin/academy/programs/${programId}`)} className="hover:text-slate-900">
                                {program.name}
                            </button>
                            <span>/</span>
                            <span>Curriculum</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Curriculum Builder</h1>
                    </div>
                    <button
                        onClick={() => router.push(`/admin/academy/programs/${programId}`)}
                        className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                    >
                        Back to Program
                    </button>
                </header>

                <div className="grid gap-6 md:grid-cols-4">
                    {/* Main Curriculum Section (3 cols) */}
                    <div className="md:col-span-3 space-y-4">
                        {!curriculum ? (
                            <Card>
                                <div className="text-center py-8">
                                    <p className="text-slate-600 mb-4">No curriculum has been created for this program yet.</p>
                                    <button
                                        onClick={handleCreateCurriculum}
                                        className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                                    >
                                        Create Curriculum
                                    </button>
                                </div>
                            </Card>
                        ) : (
                            <>
                                {/* Curriculum Info */}
                                <Card>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-semibold text-slate-900">Version {curriculum.version}</h2>
                                            <p className="text-sm text-slate-500">
                                                {curriculum.weeks.length} weeks, {curriculum.weeks.reduce((sum, w) => sum + w.lessons.length, 0)} lessons
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setNewWeek({ week_number: curriculum.weeks.length + 1, theme: "", objectives: "" });
                                                setShowAddWeek(true);
                                            }}
                                            className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                                        >
                                            + Add Week
                                        </button>
                                    </div>
                                </Card>

                                {/* Add Week Form */}
                                {showAddWeek && (
                                    <Card className="border-cyan-200 bg-cyan-50">
                                        <h3 className="font-semibold text-slate-900 mb-4">Add New Week</h3>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Week Number</label>
                                                <input
                                                    type="number"
                                                    value={newWeek.week_number}
                                                    onChange={(e) => setNewWeek({ ...newWeek, week_number: parseInt(e.target.value) || 1 })}
                                                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Theme*</label>
                                                <input
                                                    type="text"
                                                    value={newWeek.theme}
                                                    onChange={(e) => setNewWeek({ ...newWeek, theme: e.target.value })}
                                                    placeholder="e.g., Water Comfort"
                                                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Objectives</label>
                                                <input
                                                    type="text"
                                                    value={newWeek.objectives || ""}
                                                    onChange={(e) => setNewWeek({ ...newWeek, objectives: e.target.value })}
                                                    placeholder="Learning objectives"
                                                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={handleAddWeek}
                                                disabled={!newWeek.theme}
                                                className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                                            >
                                                Save Week
                                            </button>
                                            <button
                                                onClick={() => setShowAddWeek(false)}
                                                className="rounded bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </Card>
                                )}

                                {/* Week Cards with drag-and-drop */}
                                {curriculum.weeks.length === 0 ? (
                                    <Card>
                                        <p className="text-center text-slate-500 py-4">No weeks added yet. Click "Add Week" to get started.</p>
                                    </Card>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleWeekDragEnd}
                                    >
                                        <SortableContext
                                            items={curriculum.weeks
                                                .slice()
                                                .sort((a, b) => a.order_index - b.order_index)
                                                .map(w => w.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-4">
                                                {curriculum.weeks
                                                    .slice()
                                                    .sort((a, b) => a.order_index - b.order_index)
                                                    .map((week) => (
                                                        <SortableWeekCard
                                                            key={week.id}
                                                            week={week}
                                                            isExpanded={expandedWeekIds.has(week.id)}
                                                            onToggleExpand={() => toggleWeekExpansion(week.id)}
                                                            onDeleteWeek={() => handleDeleteWeek(week.id)}
                                                        >
                                                            {/* Expanded Week Content */}
                                                            <div className="mt-4 pt-4 border-t border-slate-200">
                                                                {/* Lessons with drag-and-drop */}
                                                                {week.lessons.length === 0 ? (
                                                                    <p className="text-slate-500 text-sm mb-4">No lessons in this week.</p>
                                                                ) : (
                                                                    <DndContext
                                                                        sensors={sensors}
                                                                        collisionDetection={closestCenter}
                                                                        onDragEnd={(e) => handleLessonDragEnd(week.id, e)}
                                                                    >
                                                                        <SortableContext
                                                                            items={week.lessons
                                                                                .slice()
                                                                                .sort((a, b) => a.order_index - b.order_index)
                                                                                .map(l => l.id)}
                                                                            strategy={verticalListSortingStrategy}
                                                                        >
                                                                            <div className="space-y-2 mb-4">
                                                                                {week.lessons
                                                                                    .slice()
                                                                                    .sort((a, b) => a.order_index - b.order_index)
                                                                                    .map((lesson) => (
                                                                                        <SortableLessonItem
                                                                                            key={lesson.id}
                                                                                            lesson={lesson}
                                                                                            onDelete={() => handleDeleteLesson(lesson.id)}
                                                                                        />
                                                                                    ))}
                                                                            </div>
                                                                        </SortableContext>
                                                                    </DndContext>
                                                                )}

                                                                {/* Add Lesson Form */}
                                                                {addingLessonToWeekId === week.id ? (
                                                                    <div className="bg-slate-100 rounded p-4">
                                                                        <h4 className="font-medium text-slate-900 mb-3">Add Lesson</h4>
                                                                        <div className="grid gap-3 md:grid-cols-2">
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-slate-700 mb-1">Title*</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={newLesson.title}
                                                                                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                                                                                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs font-medium text-slate-700 mb-1">Duration (min)</label>
                                                                                <input
                                                                                    type="number"
                                                                                    value={newLesson.duration_minutes || ""}
                                                                                    onChange={(e) => setNewLesson({ ...newLesson, duration_minutes: parseInt(e.target.value) || undefined })}
                                                                                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="md:col-span-2">
                                                                                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                                                                                <textarea
                                                                                    value={newLesson.description || ""}
                                                                                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                                                                                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                                                                    rows={2}
                                                                                />
                                                                            </div>
                                                                            <div className="md:col-span-2">
                                                                                <label className="block text-xs font-medium text-slate-700 mb-1">Video URL</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={newLesson.video_url || ""}
                                                                                    onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })}
                                                                                    placeholder="https://... (instructional video)"
                                                                                    className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="md:col-span-2">
                                                                                <label className="block text-xs font-medium text-slate-700 mb-1">Skills (click to select)</label>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {skills.map(skill => (
                                                                                        <button
                                                                                            key={skill.id}
                                                                                            onClick={() => toggleLessonSkill(skill.id)}
                                                                                            className={`px-2 py-1 rounded text-xs ${(newLesson.skill_ids || []).includes(skill.id)
                                                                                                ? "bg-cyan-600 text-white"
                                                                                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                                                                }`}
                                                                                        >
                                                                                            {skill.name}
                                                                                        </button>
                                                                                    ))}
                                                                                    {skills.length === 0 && (
                                                                                        <span className="text-xs text-slate-500">No skills yet. Add skills in the sidebar.</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 mt-3">
                                                                            <button
                                                                                onClick={() => handleAddLesson(week.id)}
                                                                                disabled={!newLesson.title}
                                                                                className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                                                                            >
                                                                                Save Lesson
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setAddingLessonToWeekId(null);
                                                                                    setNewLesson({ title: "", description: "", duration_minutes: 30, video_url: "", skill_ids: [] });
                                                                                }}
                                                                                className="rounded bg-white px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50"
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => setAddingLessonToWeekId(week.id)}
                                                                        className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                                                                    >
                                                                        + Add Lesson
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </SortableWeekCard>
                                                    ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </>
                        )}
                    </div>

                    {/* Skills Sidebar (1 col) */}
                    <div className="space-y-4">
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">Skills Library</h2>
                                <button
                                    onClick={() => setShowAddSkill(true)}
                                    className="text-cyan-600 hover:text-cyan-700 text-sm font-medium"
                                >
                                    + Add
                                </button>
                            </div>

                            {/* Add Skill Form */}
                            {showAddSkill && (
                                <div className="border-b border-slate-200 pb-4 mb-4">
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={newSkill.name}
                                            onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                                            placeholder="Skill name"
                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                        />
                                        <select
                                            value={newSkill.category}
                                            onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                                            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                                        >
                                            {SKILL_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleAddSkill}
                                                disabled={!newSkill.name}
                                                className="rounded bg-cyan-600 px-3 py-1 text-xs font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => setShowAddSkill(false)}
                                                className="text-slate-500 hover:text-slate-700 text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Skills List */}
                            {skills.length === 0 ? (
                                <p className="text-sm text-slate-500">No skills yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {SKILL_CATEGORIES.map(cat => {
                                        const catSkills = skills.filter(s => s.category === cat.value);
                                        if (catSkills.length === 0) return null;
                                        return (
                                            <div key={cat.value}>
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{cat.label}</p>
                                                {catSkills.map(skill => (
                                                    <div key={skill.id} className="flex items-center justify-between py-1">
                                                        <span className="text-sm text-slate-700">{skill.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteSkill(skill.id);
                                                            }}
                                                            className="text-red-400 hover:text-red-600 text-xs"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}
