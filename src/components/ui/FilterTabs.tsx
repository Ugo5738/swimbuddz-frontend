import clsx from "clsx";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  /** Array of filter options */
  options: FilterOption<T>[];
  /** Currently selected value */
  value: T;
  /** Callback when selection changes */
  onChange: (value: T) => void;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: FilterTabsProps<T>) {
  const sizeStyles =
    size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";

  return (
    <div className={clsx("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "rounded-lg font-medium transition-colors",
            sizeStyles,
            value === option.value
              ? "bg-cyan-100 text-cyan-700 border border-cyan-300"
              : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
