import type { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx("rounded-2xl border border-slate-100 bg-white p-6 shadow-sm", className)}>
      {children}
    </div>
  );
}
