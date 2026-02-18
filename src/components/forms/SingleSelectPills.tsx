import clsx from "clsx";

type SingleSelectPillsProps = {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export function SingleSelectPills({
  label,
  options,
  value,
  onChange,
  required,
}: SingleSelectPillsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-700">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-rose-500">
            *
          </span>
        ) : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              type="button"
              key={option.value}
              className={clsx(
                "rounded-full border px-4 py-2 text-sm font-medium",
                active
                  ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                  : "border-slate-300 text-slate-600 hover:border-slate-400",
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
