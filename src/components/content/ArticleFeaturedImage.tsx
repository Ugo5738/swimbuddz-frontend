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
        className={`relative flex aspect-video w-full items-center justify-center overflow-hidden bg-slate-900 ${className}`}
        data-article-media-variant="card"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, 33vw"}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center overflow-hidden bg-slate-900 ${className}`}
      data-article-media-variant="detail"
    >
      <Image
        src={src}
        alt={alt}
        width={0}
        height={0}
        sizes={sizes ?? "(max-width: 768px) 100vw, 800px"}
        className="block h-auto max-h-[min(75vh,48rem)] w-auto max-w-full object-contain"
        style={{ width: "auto", height: "auto" }}
        priority={priority}
      />
    </div>
  );
}
