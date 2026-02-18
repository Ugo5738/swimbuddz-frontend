import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "./Card";

type ColorVariant =
  | "cyan"
  | "amber"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "slate"
  | "rose";

const colorStyles: Record<
  ColorVariant,
  {
    border: string;
    bg: string;
    iconBg: string;
    iconText: string;
    labelText: string;
    linkText: string;
  }
> = {
  cyan: {
    border: "border-l-cyan-500",
    bg: "",
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
    labelText: "text-slate-600",
    linkText: "text-cyan-600 hover:text-cyan-700",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-50/50",
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    labelText: "text-amber-700",
    linkText: "text-amber-700 hover:text-amber-800",
  },
  green: {
    border: "border-l-green-500",
    bg: "",
    iconBg: "bg-green-100",
    iconText: "text-green-600",
    labelText: "text-slate-600",
    linkText: "text-green-600 hover:text-green-700",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "",
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
    labelText: "text-slate-600",
    linkText: "text-blue-600 hover:text-blue-700",
  },
  purple: {
    border: "border-l-purple-500",
    bg: "",
    iconBg: "bg-purple-100",
    iconText: "text-purple-600",
    labelText: "text-slate-600",
    linkText: "text-purple-600 hover:text-purple-700",
  },
  orange: {
    border: "border-l-orange-500",
    bg: "",
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    labelText: "text-slate-600",
    linkText: "text-orange-600 hover:text-orange-700",
  },
  slate: {
    border: "border-l-slate-500",
    bg: "",
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    labelText: "text-slate-600",
    linkText: "text-slate-600 hover:text-slate-700",
  },
  rose: {
    border: "border-l-rose-500",
    bg: "",
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    labelText: "text-slate-600",
    linkText: "text-rose-600 hover:text-rose-700",
  },
};

interface StatsCardProps {
  /** The label/title for the stat */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional icon component */
  icon?: ReactNode;
  /** Color variant for the card accent */
  color?: ColorVariant;
  /** Optional link for the card action */
  href?: string;
  /** Optional link text (defaults to "View all") */
  linkText?: string;
  /** Optional description or subtitle */
  description?: string;
  /** Whether to show the elaborate style with border accent */
  variant?: "simple" | "elaborate";
  /** Additional className */
  className?: string;
}

export function StatsCard({
  label,
  value,
  icon,
  color = "cyan",
  href,
  linkText = "View all",
  description,
  variant = "elaborate",
  className,
}: StatsCardProps) {
  const styles = colorStyles[color];

  if (variant === "simple") {
    return (
      <Card className={clsx("p-4", className)}>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {description && (
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        )}
      </Card>
    );
  }

  return (
    <Card
      className={clsx(
        "overflow-hidden border-l-4 transition-shadow hover:shadow-lg",
        styles.border,
        styles.bg,
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={clsx("text-sm font-medium", styles.labelText)}>
            {label}
          </p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        {icon && (
          <div className={clsx("rounded-full p-3", styles.iconBg)}>
            <div className={clsx("h-6 w-6", styles.iconText)}>{icon}</div>
          </div>
        )}
      </div>
      {href ? (
        <Link
          href={href}
          className={clsx(
            "mt-4 flex items-center gap-1 text-sm font-medium",
            styles.linkText,
          )}
        >
          {linkText} <ArrowRight className="h-4 w-4" />
        </Link>
      ) : description ? (
        <p className="mt-4 text-sm text-slate-500">{description}</p>
      ) : null}
    </Card>
  );
}
