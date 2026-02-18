"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

type PasswordFieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
};

export function PasswordField({
  label,
  name,
  value,
  placeholder,
  onChange,
  required,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = name;

  return (
    <label
      className="flex flex-col gap-1 text-sm font-medium text-slate-700"
      htmlFor={inputId}
    >
      <span className="flex items-center gap-1">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-rose-500">
            *
          </span>
        ) : null}
      </span>
      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-700"
          onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeSlashIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </label>
  );
}
