"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type GuideMarkdownProps = {
  content: string;
};

/** Slugify heading text to produce stable anchor IDs. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

/**
 * Renders a full guide's markdown using the site's existing `.markdown-content`
 * styles from globals.css. Headings get stable IDs so anchor links work, and
 * tables scroll on small screens.
 */
export function GuideMarkdown({ content }: GuideMarkdownProps): ReactNode {
  return (
    <article className="markdown-content max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children, ...props }) => (
            <h1 id={slugify(String(children))} {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 id={slugify(String(children))} {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 id={slugify(String(children))} {...props}>
              {children}
            </h3>
          ),
          table: ({ children, ...props }) => (
            <div className="my-6 overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
