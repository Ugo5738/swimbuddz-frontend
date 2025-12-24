"use client";

import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";

interface BlockViewerProps {
    content: string;
    className?: string;
}

/**
 * Notion-style read-only viewer for displaying block content.
 * Handles both JSON blocks (new format) and markdown (legacy format).
 */
export function BlockViewer({ content, className = "" }: BlockViewerProps) {
    // Try to parse as JSON blocks
    const parsedBlocks = useMemo(() => {
        if (!content) return null;

        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed as PartialBlock[];
            }
        } catch {
            // Not JSON, will fall back to markdown
        }

        return null;
    }, [content]);

    // If we have blocks, render with BlockNote viewer
    if (parsedBlocks) {
        return <BlockContentViewer blocks={parsedBlocks} className={className} />;
    }

    // Fallback to markdown for legacy content
    return (
        <div className={`prose prose-slate max-w-none ${className}`}>
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
}

interface BlockContentViewerProps {
    blocks: PartialBlock[];
    className?: string;
}

/**
 * Internal component that uses BlockNote to render blocks in read-only mode.
 */
function BlockContentViewer({ blocks, className = "" }: BlockContentViewerProps) {
    const editor = useCreateBlockNote({
        initialContent: blocks,
    });

    return (
        <div className={`block-viewer-wrapper ${className}`}>
            <BlockNoteView
                editor={editor}
                editable={false}
                theme="light"
            />
            <style jsx global>{`
                .block-viewer-wrapper {
                    background: transparent;
                }
                
                .block-viewer-wrapper .bn-editor {
                    padding: 0;
                    background: transparent;
                }
                
                /* Hide editing UI elements */
                .block-viewer-wrapper .bn-side-menu,
                .block-viewer-wrapper .bn-formatting-toolbar,
                .block-viewer-wrapper .bn-drag-handle {
                    display: none !important;
                }
                
                /* Notion-style content styling */
                .block-viewer-wrapper .bn-block-outer {
                    margin: 0.5rem 0;
                }
                
                /* Headings */
                .block-viewer-wrapper [data-content-type="heading"][data-level="1"] {
                    font-size: 1.875rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin-top: 2rem;
                    margin-bottom: 0.5rem;
                }
                
                .block-viewer-wrapper [data-content-type="heading"][data-level="2"] {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin-top: 1.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .block-viewer-wrapper [data-content-type="heading"][data-level="3"] {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin-top: 1rem;
                    margin-bottom: 0.25rem;
                }
                
                /* Paragraphs */
                .block-viewer-wrapper [data-content-type="paragraph"] {
                    color: #374151;
                    line-height: 1.75;
                }
                
                /* Lists */
                .block-viewer-wrapper [data-content-type="bulletListItem"],
                .block-viewer-wrapper [data-content-type="numberedListItem"] {
                    color: #374151;
                    line-height: 1.75;
                    margin-left: 1rem;
                }
                
                /* Checklist */
                .block-viewer-wrapper [data-content-type="checkListItem"] {
                    color: #374151;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                
                /* Code blocks */
                .block-viewer-wrapper [data-content-type="codeBlock"] {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                    font-size: 0.875rem;
                    overflow-x: auto;
                }
                
                /* Quotes/Callouts */
                .block-viewer-wrapper .bn-block-content[data-content-type="paragraph"][data-text-color]::before {
                    content: "";
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 3px;
                    background: #06b6d4;
                    border-radius: 2px;
                }
                
                /* Images */
                .block-viewer-wrapper img {
                    max-width: 100%;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                }
                
                /* Tables */
                .block-viewer-wrapper table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1rem 0;
                }
                
                .block-viewer-wrapper th,
                .block-viewer-wrapper td {
                    border: 1px solid #e2e8f0;
                    padding: 0.75rem;
                    text-align: left;
                }
                
                .block-viewer-wrapper th {
                    background: #f8fafc;
                    font-weight: 600;
                }
                
                /* Dividers */
                .block-viewer-wrapper hr {
                    border: none;
                    border-top: 1px solid #e2e8f0;
                    margin: 2rem 0;
                }
            `}</style>
        </div>
    );
}
