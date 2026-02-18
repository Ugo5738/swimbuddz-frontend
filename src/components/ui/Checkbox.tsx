import { InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, id, ...props }, ref) => {
    const checkbox = (
      <input
        type="checkbox"
        ref={ref}
        id={id}
        className={`h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer ${className}`}
        {...props}
      />
    );

    if (label) {
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          {checkbox}
          <span className="text-sm text-slate-700">{label}</span>
        </label>
      );
    }

    return checkbox;
  },
);

Checkbox.displayName = "Checkbox";
