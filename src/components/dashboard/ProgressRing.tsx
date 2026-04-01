"use client";

import { useEffect, useState } from "react";

type ProgressRingProps = {
  /** Value from 0–100 */
  value: number;
  /** Diameter in px */
  size?: number;
  /** Ring thickness in px */
  strokeWidth?: number;
  /** Tailwind color class for the filled arc (e.g. "text-cyan-500") */
  color?: string;
  /** Content to render in the center */
  children?: React.ReactNode;
};

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = "text-cyan-500",
  children,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Delay slightly so the animation is visible on mount
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-[stroke-dashoffset] duration-1000 ease-out`}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
