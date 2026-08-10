import { describe, expect, it } from "vitest";
import { estimateArticleReadingTime } from "../readingTime";

describe("estimateArticleReadingTime", () => {
  it("counts visible BlockNote text rather than JSON metadata", () => {
    const content = JSON.stringify([
      {
        id: "metadata-is-not-reader-text",
        type: "paragraph",
        content: [{ type: "text", text: `${"word ".repeat(226)}`, styles: {} }],
      },
    ]);

    expect(estimateArticleReadingTime(content)).toBe(2);
  });

  it("supports Markdown and always returns at least one minute", () => {
    expect(estimateArticleReadingTime("# Quick swim tip")).toBe(1);
    expect(estimateArticleReadingTime("")).toBe(1);
  });
});
