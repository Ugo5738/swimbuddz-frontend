"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownProps {
  children: string;
  /** Control text size. Defaults to "sm". */
  size?: "xs" | "sm" | "base";
  className?: string;
}

function makeComponents(textSize: string): Components {
  return {
    p: ({ children }) => (
      <p className={`${textSize} text-slate-600 leading-relaxed mb-2 last:mb-0`}>
        {children}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),
    em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
    ul: ({ children }) => (
      <ul className={`${textSize} list-disc pl-5 space-y-0.5 mb-2 text-slate-600`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={`${textSize} list-decimal pl-5 space-y-0.5 mb-2 text-slate-600`}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-600 hover:text-cyan-700 underline"
      >
        {children}
      </a>
    ),
  };
}

/**
 * Renders Markdown using the site's existing font and color system.
 * Supports bold, italic, lists, and links. Intentionally no headings or code blocks.
 */
export function Markdown({ children, size = "sm", className = "" }: MarkdownProps) {
  const textSize = { xs: "text-xs", sm: "text-sm", base: "text-base" }[size];
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={makeComponents(textSize)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
