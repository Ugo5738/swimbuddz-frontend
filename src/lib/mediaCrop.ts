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
