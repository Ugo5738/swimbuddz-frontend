import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Input({ label, hint, error, className, id, ...props }: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={clsx(
          "rounded-md border px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
          error ? "border-rose-400" : "border-slate-200",
          className
        )}
        {...props}
      />
      {hint && !error ? <span className="text-xs font-normal text-slate-500">{hint}</span> : null}
      {error ? <span className="text-xs font-normal text-rose-600">{error}</span> : null}
    </label>
  );
}
