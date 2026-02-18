"use client";

import clsx from "clsx";

type AvatarSize = "sm" | "md" | "lg";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: AvatarSize;
  className?: string;
};

const sizeClass: Record<AvatarSize, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
}: AvatarProps) {
  const hasImage = Boolean(src);

  return (
    <div
      className={clsx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700",
        sizeClass[size],
        className,
      )}
      aria-label={alt}
      title={alt}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src as string}
          alt={alt || "Avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="font-semibold">{fallback || "—"}</span>
      )}
    </div>
  );
}
