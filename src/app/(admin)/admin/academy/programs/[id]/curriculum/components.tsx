// Curriculum builder — sub-components extracted from page.tsx during
// the file-size sweep. All pure props-driven.

"use client";

import { Card } from "@/components/ui/Card";
import { type CurriculumWeek } from "@/lib/academy";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Custom Confirm Modal (replaces native window.confirm which has issues)
export function ConfirmModal({
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
export function SortableWeekCard({
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
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
              <span className="text-xl">{isExpanded ? "▼" : "▶"}</span>
              <div className="text-left">
                <h3 className="font-semibold text-slate-900">
                  Week {week.week_number}: {week.theme}
                </h3>
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
export function SortableLessonItem({
  lesson,
  onDelete,
}: {
  lesson: {
    id: string;
    title: string;
    duration_minutes?: number;
    skills: { name: string }[];
  };
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
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
                Skills: {lesson.skills.map((s) => s.name).join(", ")}
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

