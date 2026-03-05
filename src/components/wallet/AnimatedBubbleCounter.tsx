"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedBubbleCounterProps = {
  value: number;
  duration?: number;
  className?: string;
};

/**
 * Animated count-up component for Bubble balance display.
 * Animates from a cached previous value to the new value.
 */
export function AnimatedBubbleCounter({
  value,
  duration = 1000,
  className,
}: AnimatedBubbleCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);
  const previousValueRef = useRef<number | null>(null);

  useEffect(() => {
    // Try to get cached previous value
    let startValue = value;
    try {
      const cached = localStorage.getItem("swimbuddz_bubble_balance");
      if (cached !== null) {
        const parsed = Number(cached);
        if (!isNaN(parsed) && parsed !== value) {
          startValue = parsed;
        }
      }
    } catch {
      // ignore
    }

    // Only animate if there's a difference and it hasn't been animated this mount
    if (startValue === value || previousValueRef.current === value) {
      setDisplayValue(value);
      // Cache the current value
      try {
        localStorage.setItem("swimbuddz_bubble_balance", String(value));
      } catch {
        // ignore
      }
      return;
    }

    previousValueRef.current = value;
    const startTime = performance.now();
    const diff = value - startValue;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + diff * eased);
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        // Cache the new value
        try {
          localStorage.setItem("swimbuddz_bubble_balance", String(value));
        } catch {
          // ignore
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span className={className}>{displayValue.toLocaleString()}</span>;
}
