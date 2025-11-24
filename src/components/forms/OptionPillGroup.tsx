import clsx from "clsx";

type OptionPillGroupProps = {
    label: string;
    options: { value: string; label: string }[];
    selected: string[];
    onToggle: (value: string) => void;
    hint?: string;
    required?: boolean;
};

export function OptionPillGroup({ label, options, selected, onToggle, hint, required }: OptionPillGroupProps) {
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
            {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const active = selected.includes(option.value);
                    return (
                        <label
                            key={option.value}
                            className={clsx(
                                "inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium",
                                active
                                    ? "border-cyan-600 bg-cyan-50 text-cyan-900"
                                    : "border-slate-300 text-slate-600 hover:border-slate-400"
                            )}
                        >
                            <input
                                type="checkbox"
                                className="sr-only"
                                checked={active}
                                onChange={() => onToggle(option.value)}
                            />
                            {option.label}
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
}
