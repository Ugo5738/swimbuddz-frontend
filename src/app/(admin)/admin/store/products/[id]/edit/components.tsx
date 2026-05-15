// Small presentational components extracted from page.tsx during the
// file-size sweep. Pure props-driven.

import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

/* ── Sortable wrapper for image cards in the DnD grid ── */
export function SortableImageWrapper({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      {/* Drag handle – visible on hover in top-left area */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="absolute top-1 left-1 z-20 cursor-grab active:cursor-grabbing w-5 h-5 flex items-center justify-center rounded-full bg-slate-700/70 text-white opacity-0 group-hover/drag:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
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
      {children}
    </div>
  );
}
