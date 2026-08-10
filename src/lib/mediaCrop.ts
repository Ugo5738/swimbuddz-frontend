export type PresentationImagePurpose =
  | "profile_photo"
  | "cover_image"
  | "content_image"
  | "category_image"
  | "collection_image"
  | "product_image"
  | "badge_image"
  | "challenge_example"
  | "homepage_banner"
  | "homepage_community_photo";

export type NormalizedCropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageAdjustments = {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  highlights: number;
  shadows: number;
};

export type ImageFilterName = "original" | "clean" | "pool" | "warm" | "monochrome";

export type ImageTransformRecipe = {
  version: 1;
  crop: NormalizedCropArea;
  rotation: number;
  flip_horizontal: boolean;
  flip_vertical: boolean;
  adjustments: ImageAdjustments;
  filter: {
    name: ImageFilterName;
    strength: number;
  };
};

export const DEFAULT_IMAGE_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  highlights: 0,
  shadows: 0,
};

export const IMAGE_FILTERS: Record<
  ImageFilterName,
  { label: string; adjustments: ImageAdjustments }
> = {
  original: { label: "Original", adjustments: DEFAULT_IMAGE_ADJUSTMENTS },
  clean: {
    label: "Clean",
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, brightness: 4, contrast: 8, saturation: 4 },
  },
  pool: {
    label: "Pool",
    adjustments: {
      ...DEFAULT_IMAGE_ADJUSTMENTS,
      brightness: 2,
      contrast: 10,
      saturation: 12,
      warmth: -6,
    },
  },
  warm: {
    label: "Warm",
    adjustments: {
      ...DEFAULT_IMAGE_ADJUSTMENTS,
      brightness: 3,
      contrast: 4,
      saturation: 6,
      warmth: 12,
    },
  },
  monochrome: {
    label: "Monochrome",
    adjustments: { ...DEFAULT_IMAGE_ADJUSTMENTS, saturation: -100, contrast: 8 },
  },
};

export function getEffectiveImageAdjustments(
  adjustments: ImageAdjustments,
  filter: ImageTransformRecipe["filter"]
): ImageAdjustments {
  const preset = IMAGE_FILTERS[filter.name].adjustments;
  const strength = filter.strength / 100;
  return Object.fromEntries(
    (Object.keys(DEFAULT_IMAGE_ADJUSTMENTS) as Array<keyof ImageAdjustments>).map((name) => [
      name,
      Math.max(-100, Math.min(100, Math.round(adjustments[name] + preset[name] * strength))),
    ])
  ) as ImageAdjustments;
}

export type ImageCropPreset = {
  aspect: number;
  cropShape?: "rect" | "round";
};

export const IMAGE_CROP_PRESETS: Record<PresentationImagePurpose, ImageCropPreset> = {
  profile_photo: { aspect: 1, cropShape: "round" },
  cover_image: { aspect: 16 / 9 },
  content_image: { aspect: 16 / 9 },
  category_image: { aspect: 4 / 3 },
  collection_image: { aspect: 4 / 3 },
  product_image: { aspect: 1 },
  badge_image: { aspect: 1 },
  challenge_example: { aspect: 16 / 9 },
  homepage_banner: { aspect: 16 / 9 },
  homepage_community_photo: { aspect: 1 },
};

export function supportsImageAdjustment(purpose: string): purpose is PresentationImagePurpose {
  return purpose in IMAGE_CROP_PRESETS;
}
