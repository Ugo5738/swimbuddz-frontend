"use client";

import type { ComponentType, ReactNode } from "react";

type IconButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
};

export function ImageEditorIconButton({
  label,
  onClick,
  children,
  disabled,
  active,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-10 w-10 items-center justify-center rounded-md border transition disabled:opacity-40 ${
        active
          ? "border-cyan-600 bg-cyan-50 text-cyan-700"
          : "border-transparent text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

type ToolTabProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  onClick: () => void;
};

export function ImageEditorToolTab({ icon: Icon, label, selected, onClick }: ToolTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      className={`flex h-9 items-center gap-1.5 rounded px-2 text-xs font-medium transition sm:px-3 ${
        selected ? "bg-white text-cyan-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

type RangeControlProps = {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  disabled?: boolean;
  onStart: () => void;
  onEnd: () => void;
  onChange: (value: number) => void;
};

export function ImageEditorRange({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  disabled,
  onStart,
  onEnd,
  onChange,
}: RangeControlProps) {
  return (
    <div className="grid grid-cols-[minmax(84px,auto)_1fr_48px] items-center gap-3">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onPointerDown={onStart}
        onPointerUp={onEnd}
        onBlur={onEnd}
        onKeyDown={onStart}
        onKeyUp={onEnd}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 min-w-0 cursor-pointer accent-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <output htmlFor={id} className="text-right text-xs tabular-nums text-slate-500">
        {display}
      </output>
    </div>
  );
}
