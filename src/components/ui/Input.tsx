import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
};

export function Input({
  label,
  hint,
  error,
  className,
  id,
  required,
  hideLabel,
  ...props
}: InputProps) {
  const inputId = id || props.name;

  const labelClass = hideLabel ? "sr-only" : "flex items-center gap-1";

  return (
    <label
      className="flex flex-col gap-1 text-sm font-medium text-slate-700"
      htmlFor={inputId}
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
      <input
        id={inputId}
        required={required}
        className={clsx(
          "rounded-md border px-3 py-3 text-base sm:text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 min-h-[44px]",
          error ? "border-rose-400" : "border-slate-200",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <span className="text-sm sm:text-xs font-normal text-slate-500">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="text-sm sm:text-xs font-normal text-rose-600">
          {error}
        </span>
      ) : null}
    </label>
  );
}
