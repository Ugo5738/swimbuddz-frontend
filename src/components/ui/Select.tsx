import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

export function Select({
  label,
  hint,
  error,
  className,
  id,
  children,
  required,
  hideLabel,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  const labelClass = hideLabel ? "sr-only" : "flex items-center gap-1";

  return (
    <label
      className="flex flex-col gap-1 text-sm font-medium text-slate-700"
      htmlFor={selectId}
    >
      {label ? (
        <span className={labelClass}>
          {label}
          {!hideLabel && required ? (
            <span aria-hidden="true" className="text-rose-500">
              *
            </span>
          ) : null}
        </span>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          required={required}
          className={clsx(
            "w-full appearance-none rounded-md border px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
            error ? "border-rose-400" : "border-slate-200",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDownIcon
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
      </div>
      {hint && !error ? (
        <span className="text-xs font-normal text-slate-500">{hint}</span>
      ) : null}
      {error ? (
        <span className="text-xs font-normal text-rose-600">{error}</span>
      ) : null}
    </label>
  );
}
