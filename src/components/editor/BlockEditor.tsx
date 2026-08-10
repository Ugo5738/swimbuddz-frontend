"use client";

import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { uploadAdjustedImage, uploadMedia } from "@/lib/media";
import type { ImageTransformRecipe } from "@/lib/mediaCrop";
import { PartialBlock } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BlockEditorProps {
  initialContent?: PartialBlock[];
  onChange?: (blocks: PartialBlock[]) => void;
  editable?: boolean;
  placeholder?: string;
}

type PendingImageUpload = {
  file: File;
  objectUrl: string;
  resolve: (url: string) => void;
  reject: (reason: Error) => void;
};

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
  const [pendingImage, setPendingImage] = useState<PendingImageUpload | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const pendingImageRef = useRef<PendingImageUpload | null>(null);

  const clearPendingImage = useCallback((reason?: Error) => {
    const pending = pendingImageRef.current;
    if (!pending) return;
    URL.revokeObjectURL(pending.objectUrl);
    if (reason) pending.reject(reason);
    pendingImageRef.current = null;
    setPendingImage(null);
    setUploadError(null);
  }, []);

  useEffect(
    () => () => {
      const pending = pendingImageRef.current;
      if (!pending) return;
      URL.revokeObjectURL(pending.objectUrl);
      pending.reject(new Error("Image insertion was cancelled"));
    },
    []
  );

  // Create the editor instance
  const editor = useCreateBlockNote({
    initialContent: initialContent?.length ? initialContent : undefined,
    uploadFile: async (file: File) => {
      if (!file.type.startsWith("image/")) {
        const mediaItem = await uploadMedia(file, "general");
        return mediaItem.file_url;
      }

      return new Promise<string>((resolve, reject) => {
        if (pendingImageRef.current) {
          clearPendingImage(new Error("A newer image replaced this insertion"));
        }
        const pending = {
          file,
          objectUrl: URL.createObjectURL(file),
          resolve,
          reject,
        };
        pendingImageRef.current = pending;
        setPendingImage(pending);
      });
    },
  });

  const saveAdjustedImage = async (recipe: ImageTransformRecipe) => {
    const pending = pendingImageRef.current;
    if (!pending) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const mediaItem = await uploadAdjustedImage(pending.file, "content_image", recipe);
      pending.resolve(mediaItem.file_url);
      clearPendingImage();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle content changes
  const handleChange = useCallback(() => {
    if (onChange) {
      onChange(editor.document);
    }
  }, [editor, onChange]);

  return (
    <>
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
      {pendingImage ? (
        <ImageCropDialog
          isOpen
          imageUrl={pendingImage.objectUrl}
          purpose="content_image"
          isSaving={isUploading}
          error={uploadError}
          onCancel={() => clearPendingImage(new Error("Image insertion was cancelled"))}
          onConfirm={saveAdjustedImage}
        />
      ) : null}
    </>
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
