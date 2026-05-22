import clsx from "clsx";
import Image from "next/image";

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

const sizePx: Record<AvatarSize, number> = {
  sm: 32,
  md: 40,
  lg: 56,
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
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-700",
        sizeClass[size],
        className,
      )}
      aria-label={alt}
      title={alt}
    >
      {hasImage ? (
        <Image
          src={src as string}
          alt={alt || "Avatar"}
          fill
          sizes={`${sizePx[size]}px`}
          className="object-cover"
        />
      ) : (
        <span className="font-semibold">{fallback || "—"}</span>
      )}
    </div>
  );
}
