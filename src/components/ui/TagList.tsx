import clsx from "clsx";

type TagVariant = "default" | "cyan" | "emerald" | "amber" | "slate";

const variantStyles: Record<TagVariant, string> = {
  default: "bg-slate-100 text-slate-600",
  cyan: "bg-cyan-100 text-cyan-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};

interface TagListProps {
  /** Array of items to display as tags */
  items: string[];
  /** Maximum number of tags to show before truncating */
  maxItems?: number;
  /** Visual variant for the tags */
  variant?: TagVariant;
  /** Optional function to transform item values to display labels */
  getLabel?: (item: string) => string;
  /** Additional className for the container */
  className?: string;
  /** Size of the tags */
  size?: "sm" | "md";
  /** Text to show when there are no items */
  emptyText?: string;
}

export function TagList({
  items,
  maxItems = 5,
  variant = "default",
  getLabel,
  className,
  size = "sm",
  emptyText,
}: TagListProps) {
  if (items.length === 0) {
    if (emptyText) {
      return <span className="text-slate-400 text-sm">{emptyText}</span>;
    }
    return null;
  }

  const visibleItems = items.slice(0, maxItems);
  const extraCount = items.length - maxItems;

  const sizeStyles =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <div className={clsx("flex flex-wrap gap-1", className)}>
      {visibleItems.map((item) => (
        <span
          key={item}
          className={clsx(
            "rounded-full font-medium",
            sizeStyles,
            variantStyles[variant],
          )}
        >
          {getLabel ? getLabel(item) : item}
        </span>
      ))}
      {extraCount > 0 && (
        <span
          className={clsx(
            "text-slate-400",
            size === "sm" ? "text-xs" : "text-sm",
            "py-0.5",
          )}
        >
          +{extraCount} more
        </span>
      )}
    </div>
  );
}
