import type { ReactNode } from "react";
import clsx from "clsx";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

const variants = {
  info: {
    icon: InformationCircleIcon,
    classes: "border-cyan-100 bg-cyan-50 text-cyan-900",
  },
  error: {
    icon: ExclamationTriangleIcon,
    classes: "border-rose-100 bg-rose-50 text-rose-900",
  },
  success: {
    icon: CheckCircleIcon,
    classes: "border-emerald-100 bg-emerald-50 text-emerald-900",
  },
} as const;

type AlertProps = {
  title?: string;
  children?: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
};

export function Alert({
  title,
  children,
  variant = "info",
  className,
}: AlertProps) {
  const Icon = variants[variant].icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        variants[variant].classes,
        className,
      )}
    >
      <Icon className="h-5 w-5 flex-none" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? (
          <div className="text-sm leading-relaxed">{children}</div>
        ) : null}
      </div>
    </div>
  );
}
