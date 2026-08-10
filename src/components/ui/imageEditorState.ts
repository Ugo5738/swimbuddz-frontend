import {
  DEFAULT_IMAGE_ADJUSTMENTS,
  type ImageAdjustments,
  type ImageFilterName,
  type NormalizedCropArea,
} from "@/lib/mediaCrop";
import type { Point } from "react-easy-crop";

export type ImageEditorState = {
  crop: Point;
  cropArea: NormalizedCropArea | null;
  zoom: number;
  baseRotation: number;
  straighten: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  adjustments: ImageAdjustments;
  filter: { name: ImageFilterName; strength: number };
};

export function createInitialImageEditorState(): ImageEditorState {
  return {
    crop: { x: 0, y: 0 },
    cropArea: null,
    zoom: 1,
    baseRotation: 0,
    straighten: 0,
    flipHorizontal: false,
    flipVertical: false,
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS },
    filter: { name: "original", strength: 100 },
  };
}
