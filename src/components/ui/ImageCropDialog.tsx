"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  IMAGE_CROP_PRESETS,
  type NormalizedCropArea,
  type PresentationImagePurpose,
} from "@/lib/mediaCrop";
import { RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type ImageCropDialogProps = {
  isOpen: boolean;
  imageUrl: string;
  purpose: PresentationImagePurpose;
  isSaving?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (crop: NormalizedCropArea) => Promise<void> | void;
};

const INITIAL_CROP = { x: 0, y: 0 };

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
  const [crop, setCrop] = useState(INITIAL_CROP);
  const [zoom, setZoom] = useState(1);
  const [cropArea, setCropArea] = useState<NormalizedCropArea | null>(null);

  const handleCropComplete = useCallback((area: Area) => {
    setCropArea({
      x: area.x / 100,
      y: area.y / 100,
      width: area.width / 100,
      height: area.height / 100,
    });
  }, []);

  const reset = () => {
    setCrop(INITIAL_CROP);
    setZoom(1);
  };

  return (
    <Modal isOpen={isOpen} onClose={isSaving ? () => undefined : onCancel} title="Adjust image">
      <div className="relative h-72 overflow-hidden rounded-lg bg-slate-950 sm:h-80">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={preset.aspect}
          cropShape={preset.cropShape ?? "rect"}
          showGrid={preset.cropShape !== "round"}
          onCropChange={setCrop}
          onCropComplete={handleCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <label htmlFor="media-crop-zoom" className="text-sm font-medium text-slate-700">
          Zoom
        </label>
        <input
          id="media-crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          disabled={isSaving}
          className="h-2 min-w-0 flex-1 cursor-pointer accent-cyan-600"
        />
        <button
          type="button"
          onClick={reset}
          disabled={isSaving}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
          aria-label="Reset image position and zoom"
          title="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => cropArea && onConfirm(cropArea)}
          disabled={!cropArea || isSaving}
        >
          {isSaving ? "Saving..." : "Use image"}
        </Button>
      </div>
    </Modal>
  );
}
