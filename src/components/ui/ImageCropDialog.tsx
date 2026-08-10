"use client";

import { Button } from "@/components/ui/Button";
import {
  ImageEditorIconButton as IconButton,
  ImageEditorRange as RangeControl,
  ImageEditorToolTab as ToolTab,
} from "@/components/ui/ImageEditorControls";
import {
  createInitialImageEditorState,
  type ImageEditorState,
} from "@/components/ui/imageEditorState";
import { Modal } from "@/components/ui/Modal";
import { renderAdjustedImagePreview } from "@/lib/imageEditorPreview";
import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  IMAGE_CROP_PRESETS,
  IMAGE_FILTERS,
  getEffectiveImageAdjustments,
  type ImageAdjustments,
  type ImageFilterName,
  type ImageTransformRecipe,
  type PresentationImagePurpose,
} from "@/lib/mediaCrop";
import {
  Crop,
  Eye,
  FlipHorizontal2,
  FlipVertical2,
  Loader2,
  Redo2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type ImageCropDialogProps = {
  isOpen: boolean;
  imageUrl: string;
  purpose: PresentationImagePurpose;
  isSaving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (recipe: ImageTransformRecipe) => Promise<void> | void;
};

type EditorTab = "crop" | "transform" | "adjust" | "filters";

const HISTORY_LIMIT = 50;

export function ImageCropDialog({
  isOpen,
  imageUrl,
  purpose,
  isSaving = false,
  error,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const preset = IMAGE_CROP_PRESETS[purpose];
  const [activeTab, setActiveTab] = useState<EditorTab>("crop");
  const [editor, setEditor] = useState<ImageEditorState>(createInitialImageEditorState);
  const [past, setPast] = useState<ImageEditorState[]>([]);
  const [future, setFuture] = useState<ImageEditorState[]>([]);
  const [previewUrl, setPreviewUrl] = useState(imageUrl);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(imageUrl);
  const [isPreviewRendering, setIsPreviewRendering] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const editorRef = useRef(editor);
  const interactionStartRef = useRef<ImageEditorState | null>(null);

  const updateEditor = useCallback((updater: (current: ImageEditorState) => ImageEditorState) => {
    setEditor((current) => {
      const next = updater(current);
      editorRef.current = next;
      return next;
    });
  }, []);

  const commitUpdate = useCallback(
    (updater: (current: ImageEditorState) => ImageEditorState) => {
      const current = editorRef.current;
      setPast((items) => [...items, current].slice(-HISTORY_LIMIT));
      setFuture([]);
      updateEditor(updater);
    },
    [updateEditor]
  );

  useEffect(() => {
    const initial = createInitialImageEditorState();
    editorRef.current = initial;
    setEditor(initial);
    setPast([]);
    setFuture([]);
    setActiveTab("crop");
    setPreviewUrl(imageUrl);
    setOriginalPreviewUrl(imageUrl);
  }, [imageUrl, purpose]);

  const effectiveAdjustments = useMemo(
    () => getEffectiveImageAdjustments(editor.adjustments, editor.filter),
    [editor.adjustments, editor.filter]
  );

  useEffect(() => {
    const hasVisibleEdits =
      Object.values(effectiveAdjustments).some((value) => value !== 0) ||
      editor.flipHorizontal ||
      editor.flipVertical;
    if (!hasVisibleEdits) {
      setPreviewUrl(imageUrl);
      setIsPreviewRendering(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsPreviewRendering(true);
      try {
        const rendered = await renderAdjustedImagePreview(
          imageUrl,
          effectiveAdjustments,
          editor.flipHorizontal,
          editor.flipVertical
        );
        if (!cancelled) setPreviewUrl(rendered);
      } catch {
        if (!cancelled) setPreviewUrl(imageUrl);
      } finally {
        if (!cancelled) setIsPreviewRendering(false);
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [editor.flipHorizontal, editor.flipVertical, effectiveAdjustments, imageUrl]);

  useEffect(() => {
    if (!editor.flipHorizontal && !editor.flipVertical) {
      setOriginalPreviewUrl(imageUrl);
      return;
    }

    let cancelled = false;
    renderAdjustedImagePreview(
      imageUrl,
      DEFAULT_IMAGE_ADJUSTMENTS,
      editor.flipHorizontal,
      editor.flipVertical
    )
      .then((rendered) => {
        if (!cancelled) setOriginalPreviewUrl(rendered);
      })
      .catch(() => {
        if (!cancelled) setOriginalPreviewUrl(imageUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [editor.flipHorizontal, editor.flipVertical, imageUrl]);

  const beginInteraction = useCallback(() => {
    interactionStartRef.current ??= editorRef.current;
  }, []);

  const endInteraction = useCallback(() => {
    const start = interactionStartRef.current;
    interactionStartRef.current = null;
    if (!start || JSON.stringify(start) === JSON.stringify(editorRef.current)) return;
    setPast((items) => [...items, start].slice(-HISTORY_LIMIT));
    setFuture([]);
  }, []);

  const handleCropComplete = useCallback(
    (area: Area) => {
      updateEditor((current) => ({
        ...current,
        cropArea: {
          x: area.x / 100,
          y: area.y / 100,
          width: area.width / 100,
          height: area.height / 100,
        },
      }));
    },
    [updateEditor]
  );

  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [editorRef.current, ...items].slice(0, HISTORY_LIMIT));
    editorRef.current = previous;
    setEditor(previous);
  };

  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setPast((items) => [...items, editorRef.current].slice(-HISTORY_LIMIT));
    editorRef.current = next;
    setEditor(next);
  };

  const reset = () => commitUpdate(() => createInitialImageEditorState());
  const rotation = editor.baseRotation + editor.straighten;
  const displayedImage = showOriginal ? originalPreviewUrl : previewUrl;

  const confirm = () => {
    if (!editor.cropArea) return;
    onConfirm({
      version: 1,
      crop: editor.cropArea,
      rotation,
      flip_horizontal: editor.flipHorizontal,
      flip_vertical: editor.flipVertical,
      adjustments: editor.adjustments,
      filter: editor.filter,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => undefined : onCancel}
      title="Edit image"
      size="wide"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
          <ToolTab
            icon={Crop}
            label="Crop"
            selected={activeTab === "crop"}
            onClick={() => setActiveTab("crop")}
          />
          <ToolTab
            icon={RotateCw}
            label="Transform"
            selected={activeTab === "transform"}
            onClick={() => setActiveTab("transform")}
          />
          <ToolTab
            icon={SlidersHorizontal}
            label="Adjust"
            selected={activeTab === "adjust"}
            onClick={() => setActiveTab("adjust")}
          />
          <ToolTab
            icon={Sparkles}
            label="Filters"
            selected={activeTab === "filters"}
            onClick={() => setActiveTab("filters")}
          />
        </div>
        <div className="flex items-center gap-1">
          <IconButton label="Undo" onClick={undo} disabled={isSaving || past.length === 0}>
            <Undo2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Redo" onClick={redo} disabled={isSaving || future.length === 0}>
            <Redo2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Reset edits" onClick={reset} disabled={isSaving}>
            <RefreshCcw className="h-4 w-4" />
          </IconButton>
          <button
            type="button"
            aria-label="Hold to compare with original"
            title="Hold to compare with original"
            disabled={isSaving}
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerCancel={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") setShowOriginal(true);
            }}
            onKeyUp={() => setShowOriginal(false)}
            className="flex h-10 items-center gap-2 rounded-md px-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            Compare
          </button>
        </div>
      </div>

      <div className="relative h-[min(48vh,420px)] min-h-[260px] overflow-hidden rounded-lg bg-slate-950">
        <Cropper
          image={displayedImage}
          crop={editor.crop}
          zoom={editor.zoom}
          rotation={rotation}
          aspect={preset.aspect}
          cropShape={preset.cropShape ?? "rect"}
          showGrid={preset.cropShape !== "round"}
          onCropChange={(crop) => updateEditor((current) => ({ ...current, crop }))}
          onCropComplete={handleCropComplete}
          onZoomChange={(zoom) => updateEditor((current) => ({ ...current, zoom }))}
          onInteractionStart={beginInteraction}
          onInteractionEnd={endInteraction}
        />
        {isPreviewRendering ? (
          <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : null}
        {showOriginal ? (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded bg-slate-950/75 px-2 py-1 text-xs font-medium text-white">
            Original
          </span>
        ) : null}
      </div>

      <div className="min-h-[112px] rounded-lg border border-slate-200 bg-white p-4">
        {activeTab === "crop" ? (
          <RangeControl
            id="media-editor-zoom"
            label="Zoom"
            value={editor.zoom}
            min={1}
            max={3}
            step={0.01}
            display={`${editor.zoom.toFixed(2)}x`}
            disabled={isSaving}
            onStart={beginInteraction}
            onEnd={endInteraction}
            onChange={(zoom) => updateEditor((current) => ({ ...current, zoom }))}
          />
        ) : null}

        {activeTab === "transform" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconButton
                label="Rotate left 90 degrees"
                onClick={() =>
                  commitUpdate((current) => ({
                    ...current,
                    baseRotation: (current.baseRotation + 270) % 360,
                  }))
                }
              >
                <RotateCcw className="h-5 w-5" />
              </IconButton>
              <IconButton
                label="Rotate right 90 degrees"
                onClick={() =>
                  commitUpdate((current) => ({
                    ...current,
                    baseRotation: (current.baseRotation + 90) % 360,
                  }))
                }
              >
                <RotateCw className="h-5 w-5" />
              </IconButton>
              <IconButton
                label="Flip horizontally"
                active={editor.flipHorizontal}
                onClick={() =>
                  commitUpdate((current) => ({
                    ...current,
                    flipHorizontal: !current.flipHorizontal,
                  }))
                }
              >
                <FlipHorizontal2 className="h-5 w-5" />
              </IconButton>
              <IconButton
                label="Flip vertically"
                active={editor.flipVertical}
                onClick={() =>
                  commitUpdate((current) => ({
                    ...current,
                    flipVertical: !current.flipVertical,
                  }))
                }
              >
                <FlipVertical2 className="h-5 w-5" />
              </IconButton>
            </div>
            <RangeControl
              id="media-editor-straighten"
              label="Straighten"
              value={editor.straighten}
              min={-15}
              max={15}
              step={0.1}
              display={`${editor.straighten.toFixed(1)}°`}
              disabled={isSaving}
              onStart={beginInteraction}
              onEnd={endInteraction}
              onChange={(straighten) => updateEditor((current) => ({ ...current, straighten }))}
            />
          </div>
        ) : null}

        {activeTab === "adjust" ? (
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {(Object.keys(DEFAULT_IMAGE_ADJUSTMENTS) as Array<keyof ImageAdjustments>).map(
              (name) => (
                <RangeControl
                  key={name}
                  id={`media-editor-${name}`}
                  label={name[0].toUpperCase() + name.slice(1)}
                  value={editor.adjustments[name]}
                  min={-100}
                  max={100}
                  step={1}
                  display={String(editor.adjustments[name])}
                  disabled={isSaving}
                  onStart={beginInteraction}
                  onEnd={endInteraction}
                  onChange={(value) =>
                    updateEditor((current) => ({
                      ...current,
                      adjustments: { ...current.adjustments, [name]: value },
                    }))
                  }
                />
              )
            )}
          </div>
        ) : null}

        {activeTab === "filters" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {(Object.keys(IMAGE_FILTERS) as ImageFilterName[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() =>
                    commitUpdate((current) => ({
                      ...current,
                      filter: { ...current.filter, name },
                    }))
                  }
                  className={`min-h-10 rounded-md border px-2 text-xs font-medium transition ${
                    editor.filter.name === name
                      ? "border-cyan-600 bg-cyan-50 text-cyan-800"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {IMAGE_FILTERS[name].label}
                </button>
              ))}
            </div>
            <RangeControl
              id="media-editor-filter-strength"
              label="Filter strength"
              value={editor.filter.strength}
              min={0}
              max={100}
              step={1}
              display={`${editor.filter.strength}%`}
              disabled={isSaving || editor.filter.name === "original"}
              onStart={beginInteraction}
              onEnd={endInteraction}
              onChange={(strength) =>
                updateEditor((current) => ({
                  ...current,
                  filter: { ...current.filter, strength },
                }))
              }
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={confirm} disabled={!editor.cropArea || isSaving}>
          {isSaving ? "Saving..." : "Use image"}
        </Button>
      </div>
    </Modal>
  );
}
