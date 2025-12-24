"use client";

import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useCallback } from "react";

interface BlockEditorProps {
    initialContent?: PartialBlock[];
    onChange?: (blocks: PartialBlock[]) => void;
    editable?: boolean;
    placeholder?: string;
}

/**
 * Notion-style block editor for content creation.
 * Supports headings, paragraphs, lists, images, tables, code blocks, etc.
 * Uses slash commands (/) for adding blocks and drag-and-drop for reordering.
 */
export function BlockEditor({
    initialContent,
    onChange,
    editable = true,
    placeholder = "Type '/' for commands...",
}: BlockEditorProps) {
    // Create the editor instance
    const editor = useCreateBlockNote({
        initialContent: initialContent?.length ? initialContent : undefined,
        uploadFile: async (file: File) => {
            // For now, create a local object URL
            // In production, this would upload to your media service
            return URL.createObjectURL(file);
        },
    });

    // Handle content changes
    const handleChange = useCallback(() => {
        if (onChange) {
            onChange(editor.document);
        }
    }, [editor, onChange]);

    return (
        <div className="block-editor-wrapper">
            <BlockNoteView
                editor={editor}
                editable={editable}
                onChange={handleChange}
                theme="light"
                data-placeholder={placeholder}
            />
            <style jsx global>{`
                .block-editor-wrapper {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    background: white;
                    min-height: 400px;
                }
                
                .block-editor-wrapper .bn-editor {
                    padding: 1rem;
                }
                
                .block-editor-wrapper .bn-block-outer {
                    margin: 0.25rem 0;
                }
                
                /* Custom styling to match SwimBuddz design */
                .block-editor-wrapper .bn-inline-content[data-content-type="heading"] {
                    color: #0f172a;
                }
                
                .block-editor-wrapper .bn-inline-content[data-content-type="paragraph"] {
                    color: #475569;
                }
                
                /* Slash menu styling */
                .bn-suggestion-menu {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                }
                
                /* Side menu (drag handle) styling */
                .bn-side-menu {
                    opacity: 0.5;
                }
                
                .bn-side-menu:hover {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
}

/**
 * Parse content that might be JSON blocks or legacy markdown.
 * Returns blocks array or null if parsing fails.
 */
export function parseBlockContent(content: string): PartialBlock[] | null {
    if (!content) return null;

    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // Not JSON, might be legacy markdown
        return null;
    }

    return null;
}

/**
 * Serialize blocks to JSON string for storage.
 */
export function serializeBlocks(blocks: PartialBlock[]): string {
    return JSON.stringify(blocks);
}
