import type { ImageAdjustments } from "./mediaCrop";

const MAX_PREVIEW_DIMENSION = 1600;

export async function renderAdjustedImagePreview(
  imageUrl: string,
  adjustments: ImageAdjustments,
  flipHorizontal = false,
  flipVertical = false
): Promise<string> {
  if (
    Object.values(adjustments).every((value) => value === 0) &&
    !flipHorizontal &&
    !flipVertical
  ) {
    return imageUrl;
  }

  const image = await loadImage(imageUrl);
  const scale = Math.min(1, MAX_PREVIEW_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return imageUrl;

  context.save();
  context.translate(flipHorizontal ? width : 0, flipVertical ? height : 0);
  context.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
  context.drawImage(image, 0, 0, width, height);
  context.restore();
  const imageData = context.getImageData(0, 0, width, height);
  applyPixelAdjustments(imageData.data, adjustments);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function applyPixelAdjustments(
  pixels: Uint8ClampedArray,
  adjustments: ImageAdjustments
): void {
  const brightness = Math.max(0, 1 + adjustments.brightness / 200);
  const contrast = Math.max(0, 1 + adjustments.contrast / 100);
  const saturation = Math.max(0, 1 + adjustments.saturation / 100);
  const warmth = (adjustments.warmth / 100) * 24;
  const shadows = adjustments.shadows / 100;
  const highlights = adjustments.highlights / 100;

  for (let index = 0; index < pixels.length; index += 4) {
    let red = (pixels[index] * brightness - 128) * contrast + 128;
    let green = (pixels[index + 1] * brightness - 128) * contrast + 128;
    let blue = (pixels[index + 2] * brightness - 128) * contrast + 128;
    const grayscale = 0.299 * red + 0.587 * green + 0.114 * blue;
    red = grayscale + (red - grayscale) * saturation + warmth;
    green = grayscale + (green - grayscale) * saturation;
    blue = grayscale + (blue - grayscale) * saturation - warmth;

    const luminance = clampByte(0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    [red, green, blue] = applyTone([red, green, blue], shadows, (1 - luminance) ** 2);
    [red, green, blue] = applyTone([red, green, blue], highlights, luminance ** 2);

    pixels[index] = clampByte(red);
    pixels[index + 1] = clampByte(green);
    pixels[index + 2] = clampByte(blue);
  }
}

function applyTone(
  channels: [number, number, number],
  amount: number,
  weight: number
): [number, number, number] {
  if (amount === 0) return channels;
  const alpha = Math.abs(amount) * weight * (96 / 255);
  const target = amount > 0 ? 255 : 0;
  return channels.map((value) => target * alpha + value * (1 - alpha)) as [number, number, number];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image preview could not be loaded"));
    image.src = url;
  });
}
