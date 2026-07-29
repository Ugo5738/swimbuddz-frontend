import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArticleFeaturedImage } from "../ArticleFeaturedImage";

vi.mock("next/image", () => ({
  default: ({
    alt,
    fill,
    priority,
    ...props
  }: {
    alt: string;
    fill?: boolean;
    priority?: boolean;
    [key: string]: unknown;
  }) => {
    void fill;
    void priority;
    return <span role="img" aria-label={alt} {...props} />;
  },
}));

describe("ArticleFeaturedImage", () => {
  it("contains portrait media instead of cropping card thumbnails", () => {
    const { container } = render(
      <ArticleFeaturedImage
        src="https://cdn.example.com/portrait.png"
        alt="Breathing practice"
        variant="card"
      />
    );

    expect(container.firstChild).toHaveAttribute("data-article-media-variant", "card");
    expect(screen.getByRole("img")).toHaveClass("object-contain");
  });

  it("preserves intrinsic aspect ratio and caps detail media height", () => {
    const { container } = render(
      <ArticleFeaturedImage
        src="https://cdn.example.com/portrait.png"
        alt="Breathing practice"
        variant="detail"
      />
    );

    expect(container.firstChild).toHaveAttribute("data-article-media-variant", "detail");
    expect(screen.getByRole("img")).toHaveClass(
      "w-auto",
      "h-auto",
      "max-w-full",
      "max-h-[min(75vh,48rem)]",
      "object-contain"
    );
  });
});
