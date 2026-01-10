import type { ReactNode } from "react";
import clsx from "clsx";

const variants = {
  default: "bg-slate-100 text-slate-700",
  secondary: "bg-slate-200 text-slate-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-cyan-50 text-cyan-700"
} as const;

type BadgeProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
