import type { TextareaHTMLAttributes } from "react";
import clsx from "clsx";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const textareaId = id || props.name;

  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700" htmlFor={textareaId}>
      {label}
      <textarea
        id={textareaId}
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
