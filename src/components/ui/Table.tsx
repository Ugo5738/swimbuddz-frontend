import type { ReactNode } from "react";
import clsx from "clsx";

type TableProps = {
  children: ReactNode;
  className?: string;
};

type TableSectionProps = {
  children: ReactNode;
  className?: string;
};

export function Table({ children, className }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className={clsx("w-full border-collapse text-left text-sm text-slate-700", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className }: TableSectionProps) {
  return (
    <thead className={clsx("bg-slate-50 text-xs font-semibold uppercase tracking-wide", className)}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className }: TableSectionProps) {
  return <tr className={clsx("border-b border-slate-100", className)}>{children}</tr>;
}

export function TableHeaderCell({ children, className }: TableSectionProps) {
  return <th className={clsx("px-4 py-3", className)}>{children}</th>;
}

export function TableBody({ children, className }: TableSectionProps) {
  return <tbody className={clsx("divide-y divide-slate-100", className)}>{children}</tbody>;
}

export function TableCell({ children, className }: TableSectionProps) {
  return <td className={clsx("px-4 py-3", className)}>{children}</td>;
}
