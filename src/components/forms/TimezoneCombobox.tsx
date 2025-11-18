"use client";

import { useMemo, useState, useEffect, type ChangeEvent } from "react";
import clsx from "clsx";
import { timeZones } from "@/lib/timezones";

type TimezoneComboboxProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  name?: string;
  placeholder?: string;
};

export function TimezoneCombobox({ label, value, onChange, required, name, placeholder }: TimezoneComboboxProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return timeZones.slice(0, 10);
    }

    return timeZones.filter((zone) => zone.toLowerCase().includes(term)).slice(0, 10);
  }, [query]);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value;
    setQuery(nextValue);
    onChange(nextValue);
    setOpen(true);
  }

  function handleSelect(option: string) {
    onChange(option);
    setQuery(option);
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
          onBlur={() => setTimeout(() => setOpen(false), 100)}
          placeholder={placeholder ?? "Search by city or region (e.g., Africa/Lagos)"}
          required={required}
          className={clsx(
            "w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
            "placeholder:text-slate-400"
          )}
          autoComplete="off"
        />
      </label>
      {open && filteredOptions.length ? (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          <ul>
            {filteredOptions.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  className={clsx(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700",
                    option === value ? "bg-cyan-50 text-cyan-900" : "hover:bg-slate-50"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
                >
                  <span>{option}</span>
                  {option === value ? <span className="text-xs uppercase text-cyan-600">Selected</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
