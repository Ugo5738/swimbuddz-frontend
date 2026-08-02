"use client";

import Image from "next/image";

interface ArticleFeaturedImageProps {
  src: string;
  alt: string;
  variant: "card" | "detail";
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function ArticleFeaturedImage({
  src,
  alt,
  variant,
  className = "",
  priority = false,
  sizes,
}: ArticleFeaturedImageProps) {
  if (variant === "card") {
    return (
      <div
        className={`relative aspect-video w-full overflow-hidden bg-slate-900 ${className}`}
        data-article-media-variant="card"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video w-full overflow-hidden bg-slate-900 ${className}`}
      data-article-media-variant="detail"
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 800px"}
        className="object-cover"
        priority={priority}
      />
    </div>
  );
}
