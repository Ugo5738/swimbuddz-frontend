import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:opacity-60";

const variants = {
  primary: "bg-cyan-600 text-white hover:bg-cyan-500",
  secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-cyan-700 hover:bg-cyan-50",
  danger: "bg-rose-600 text-white hover:bg-rose-500"
} as const;

const sizes = {
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
  sm: "px-3 py-1.5 text-xs"
} as const;

type ButtonProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button className={clsx(baseClasses, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
