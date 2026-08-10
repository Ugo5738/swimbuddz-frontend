const WORDS_PER_MINUTE = 225;
const WORD_PATTERN = /\b[\w]+(?:[\u2019'-][\w]+)*\b/g;

function extractBlockText(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(extractBlockText);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const node = value as Record<string, unknown>;
  const text = typeof node.text === "string" ? [node.text] : [];

  return [...text, ...extractBlockText(node.content), ...extractBlockText(node.children)];
}

/** Estimate article reading time using the same 225 wpm rule as publication emails. */
export function estimateArticleReadingTime(content: string | null | undefined): number {
  const raw = content?.trim() ?? "";
  if (!raw) return 1;

  let visibleText = raw;

  try {
    const blockText = extractBlockText(JSON.parse(raw));
    if (blockText.length > 0) {
      visibleText = blockText.join(" ");
    }
  } catch {
    // Legacy article bodies may be Markdown rather than BlockNote JSON.
  }

  visibleText = visibleText
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#*_>`~\[\](){}|]/g, " ");

  const wordCount = visibleText.match(WORD_PATTERN)?.length ?? 0;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
