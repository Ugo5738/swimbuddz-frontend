"use client";

import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
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
            // Upload to media service
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    console.error("Not authenticated for file upload");
                    return URL.createObjectURL(file);
                }

                const formData = new FormData();
                formData.append("file", file);
                formData.append("purpose", "content_image");

                const response = await fetch(`${API_BASE_URL}/api/v1/media/upload`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    },
                    body: formData,
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.file_url;
                } else {
                    console.error("Failed to upload file:", await response.text());
                    return URL.createObjectURL(file);
                }
            } catch (error) {
                console.error("Error uploading file:", error);
                return URL.createObjectURL(file);
            }
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
                    background: white;
                    min-height: 400px;
                    position: relative;
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

                /* Slash menu and dropdown styling - high z-index to appear above sidebar */
                .bn-suggestion-menu,
                .bn-slash-menu,
                .bn-color-picker,
                .bn-formatting-toolbar,
                .bn-link-toolbar,
                .bn-image-toolbar,
                [data-tippy-root],
                .tippy-box {
                    z-index: 9999 !important;
                }

                .bn-suggestion-menu {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    max-height: 400px;
                    overflow-y: auto;
                }

                /* Ensure dropdown menus have proper overflow */
                .bn-suggestion-menu-wrapper,
                .bn-menu-dropdown {
                    overflow: visible !important;
                }

                /* Side menu (drag handle) styling */
                .bn-side-menu {
                    opacity: 0.5;
                    z-index: 100;
                }

                .bn-side-menu:hover {
                    opacity: 1;
                }

                /* Color picker dropdown fix */
                .bn-color-picker-dropdown {
                    z-index: 9999 !important;
                }

                /* Mantine popover/menu fix for BlockNote */
                .mantine-Popover-dropdown,
                .mantine-Menu-dropdown {
                    z-index: 9999 !important;
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
