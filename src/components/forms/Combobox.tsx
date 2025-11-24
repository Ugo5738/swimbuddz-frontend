"use client";

import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import clsx from "clsx";

export type ComboboxOption = {
    value: string;
    label: string;
};

type ComboboxProps = {
    label: string;
    value: string;
    options: ComboboxOption[];
    onChange: (value: string) => void;
    required?: boolean;
    name?: string;
    placeholder?: string;
};

export function Combobox({ label, value, options, onChange, required, name, placeholder }: ComboboxProps) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    // Initialize query based on current value
    useEffect(() => {
        const selectedOption = options.find((opt) => opt.value === value);
        if (selectedOption) {
            setQuery(selectedOption.label);
        } else if (!value) {
            setQuery("");
        }
    }, [value, options]);

    const filteredOptions = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) {
            return options.slice(0, 50);
        }

        return options.filter((opt) => opt.label.toLowerCase().includes(term)).slice(0, 50);
    }, [query, options]);

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const nextValue = event.target.value;
        setQuery(nextValue);
        setOpen(true);

        // If the user clears the input, we might want to clear the value
        if (nextValue === "") {
            onChange("");
        }
    }

    function handleSelect(option: ComboboxOption) {
        onChange(option.value);
        setQuery(option.label);
        setOpen(false);
    }

    return (
        <div className="relative">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-1">
                    {label}
                    {required ? (
                        <span aria-hidden="true" className="text-rose-500">
                            *
                        </span>
                    ) : null}
                </span>
                <input
                    type="text"
                    name={name}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 200)}
                    placeholder={placeholder ?? "Search..."}
                    required={required}
                    className={clsx(
                        "w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
                        "placeholder:text-slate-400"
                    )}
                    autoComplete="off"
                />
            </label>
            {open && filteredOptions.length > 0 ? (
                <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                    <ul>
                        {filteredOptions.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    className={clsx(
                                        "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700",
                                        option.value === value ? "bg-cyan-50 text-cyan-900" : "hover:bg-slate-50"
                                    )}
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => handleSelect(option)}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value ? <span className="text-xs uppercase text-cyan-600">Selected</span> : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
