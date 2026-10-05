"use client";

import { FileUpload } from "@/components/ui/FileUpload";
import { ImageCropDialog } from "@/components/ui/ImageCropDialog";
import { registerMediaUrl, uploadAdjustedImage, uploadMedia } from "@/lib/media";
import { supportsImageAdjustment, type ImageTransformRecipe } from "@/lib/mediaCrop";
import { Check, Link, Loader2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type MediaInputMode = "upload-only" | "url-only" | "both";

interface MediaInputProps {
  /** The purpose for the upload - determines file validation */
  purpose:
    | "coach_document"
    | "payment_proof"
    | "milestone_evidence"
    | "milestone_video"
    | "profile_photo"
    | "cover_image"
    | "size_chart"
    | "category_image"
    | "collection_image"
    | "product_image"
    | "product_video"
    | "content_image"
    | "challenge_example"
    | "challenge_proof"
    | "badge_image"
    | "general";
  /** Display mode - upload-only shows just upload, both shows tabs */
  mode?: MediaInputMode;
  multiple?: boolean;
  /** Current media_id value */
  value?: string | null;
  /** Callback when media is uploaded/registered, returns media_id */
  onChange: (mediaId: string | null, fileUrl?: string) => void | Promise<void>;
  /** Callback when upload fails, exposes error to parent */
  onError?: (error: string | null) => void;
  /** Callback when an upload starts or finishes. Lets the parent block submit
   *  while a file is still being uploaded — without this, a user can hit
   *  "Submit" before the media_id is set, and the upload becomes an orphan. */
  onUploadingChange?: (uploading: boolean) => void;
  /** Optional label */
  label?: string;
  /** Accept attribute for file input */
  accept?: string;
  /** Show preview of uploaded image */
  showPreview?: boolean;
  /** Additional class names */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function MediaInput({
  purpose,
  mode = "upload-only",
  multiple = false,
  value,
  onChange,
  onError,
  onUploadingChange,
  label,
  accept,
  showPreview = true,
  className = "",
  disabled = false,
}: MediaInputProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState("");
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    objectUrl: string;
  } | null>(null);

  useEffect(
    () => () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.objectUrl);
    },
    [pendingImage]
  );

  useEffect(() => () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Determine accept types based on purpose if not provided
  const getAcceptTypes = () => {
    if (accept) return accept;
    switch (purpose) {
      case "profile_photo":
      case "cover_image":
      case "content_image":
      case "category_image":
      case "collection_image":
      case "product_image":
        return "image/*";
      case "product_video":
        return "video/*";
      case "size_chart":
        return "image/*,.pdf";
      case "milestone_evidence":
        return "image/*,video/*";
      case "milestone_video":
        return "image/*,video/*";
      case "challenge_example":
      case "challenge_proof":
        return "image/*,video/*";
      case "badge_image":
        return "image/*";
      case "coach_document":
      case "payment_proof":
        return "image/*,.pdf";
      default:
        return "*/*";
    }
  };

  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      onError?.(null);

      if (file.type.startsWith("image/") && supportsImageAdjustment(purpose)) {
        setPendingImage((current) => {
          if (current) URL.revokeObjectURL(current.objectUrl);
          return { file, objectUrl: URL.createObjectURL(file) };
        });
        return;
      }

      setProgress(0);
      setFilename(file.name);
      setIsUploading(true);
      onUploadingChange?.(true);

      try {
        const mediaItem = await uploadMedia(file, purpose, undefined, undefined, undefined, { onProgress: setProgress });

        // Set preview for images and videos
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
          setPreviewIsVideo(file.type.startsWith("video/"));
          setPreviewUrl(URL.createObjectURL(file));
        }

        await onChange(mediaItem.id, mediaItem.file_url);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsUploading(false);
        onUploadingChange?.(false);
      }
    },
    [purpose, onChange, onError, onUploadingChange]
  );

  const closeImageAdjustment = useCallback(() => {
    setPendingImage((current) => {
      if (current) URL.revokeObjectURL(current.objectUrl);
      return null;
    });
  }, []);

  const handleAdjustedImage = async (recipe: ImageTransformRecipe) => {
    if (!pendingImage || !supportsImageAdjustment(purpose)) return;

    setError(null);
    onError?.(null);
    setProgress(0);
    setFilename(pendingImage.file.name);
    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const mediaItem = await uploadAdjustedImage(pendingImage.file, purpose, recipe, undefined, undefined, { onProgress: setProgress });
      setPreviewUrl(mediaItem.file_url);
      await onChange(mediaItem.id, mediaItem.file_url);
      closeImageAdjustment();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Image adjustment failed";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;

    setError(null);
    onError?.(null);
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const mediaType =
        urlInput.includes("youtube") || urlInput.includes("youtu.be")
          ? "video"
          : supportsImageAdjustment(purpose)
            ? "image"
            : "link";
      const mediaItem = await registerMediaUrl(urlInput.trim(), purpose, mediaType);

      setPreviewUrl(urlInput);
      await onChange(mediaItem.id, mediaItem.file_url);
      setUrlInput("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to register URL";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setPreviewUrl(null);
    setUrlInput("");
    closeImageAdjustment();
  };

  const requiresAdjustedUpload = supportsImageAdjustment(purpose);
  const showTabs = mode === "both" && !requiresAdjustedUpload;
  const showUpload = requiresAdjustedUpload || mode === "upload-only" || mode === "both";
  const showUrl = !requiresAdjustedUpload && (mode === "url-only" || mode === "both");

  return (
    <div className={`media-input ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}

      {/* Tabs */}
      {showTabs && (
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "upload"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Upload className="w-4 h-4 inline mr-1" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("url")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "url"
                ? "border-cyan-500 text-cyan-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Link className="w-4 h-4 inline mr-1" />
            Paste URL
          </button>
        </div>
      )}

      {/* Current value indicator */}
      {value && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <Check className="w-4 h-4 text-green-600" />
          <span className="text-sm text-green-700 flex-1">Media uploaded successfully</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600"
            disabled={disabled || isUploading}
            aria-label="Remove upload"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview */}
      {showPreview && previewUrl && !value && (
        <div className="mb-3">
          {previewUrl.match(/\.(mp4|mov|webm|avi|mkv)$/i) ||
          (previewUrl.startsWith("blob:") && previewIsVideo) ? (
            <video src={previewUrl} controls className="max-h-32 rounded-lg" />
          ) : previewUrl.startsWith("blob:") || previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            // Intentional raw <img> (CONVENTIONS §5, G4 exception):
            // previewUrl is a local blob:/object URL for a just-selected
            // file — next/image can't optimise it. Do not "fix".
            <img src={previewUrl} alt="Preview" className="max-h-32 rounded-lg object-cover" /> // eslint-disable-line @next/next/no-img-element
          ) : (
            <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">{previewUrl}</div>
          )}
        </div>
      )}

      {/* Upload area */}
      {showUpload && (activeTab === "upload" || !showTabs) && !value && (
        <FileUpload
          label={label || "Upload file"}
          accept={getAcceptTypes()}
          multiple={multiple && !requiresAdjustedUpload}
          disabled={disabled}
          uploading={isUploading}
          progress={progress}
          filename={filename}
          helpText={getAcceptTypes().replace("*/*", "Any file type")}
          onFiles={async (files) => {
            for (const file of files) await handleFileSelect(file);
          }}
        />
      )}

      {/* URL input area */}
      {showUrl && activeTab === "url" && !value && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg or YouTube URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={disabled || isUploading}
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim() || disabled || isUploading}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Enter a direct link to an image, video, or YouTube URL
          </p>
        </div>
      )}

      {pendingImage && supportsImageAdjustment(purpose) ? (
        <ImageCropDialog
          isOpen
          imageUrl={pendingImage.objectUrl}
          purpose={purpose}
          isSaving={isUploading}
          uploadProgress={progress}
          error={error}
          onCancel={closeImageAdjustment}
          onConfirm={handleAdjustedImage}
        />
      ) : null}

      {/* Error message */}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default MediaInput;
