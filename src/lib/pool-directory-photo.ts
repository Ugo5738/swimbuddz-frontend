/** Resolve a pool asset to a stable public URL before directory publication.
 *
 * Pool admin uploads use media-service purpose "general" (the public bucket).
 * Private/swimmer evidence must never be promoted into public directory media.
 */
import { getMedia, type MediaItem } from "./media";

type PoolPhotoSource = {
  media_id: string | null;
  url: string | null;
};

function validateHttpsPhoto(url: string | null | undefined): string {
  if (!url) throw new Error("This photo has no public URL. Check the media upload.");
  let parsed: URL;
  try { parsed = new URL(url); }
  catch { throw new Error("This photo does not have a valid public URL."); }
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Only HTTPS photo URLs can be published to the directory.");
  }
  const query = parsed.searchParams;
  if (
    [...query.keys()].some((key) =>
      /^(x-amz-|x-goog-|signature$|token$|expires$|exp$)/i.test(key)
    )
  ) {
    throw new Error("Temporary signed links cannot be used for the public directory.");
  }
  return url;
}

export async function resolvePublicPoolPhotoUrl(
  photo: PoolPhotoSource,
  loadMedia: (mediaId: string) => Promise<Pick<MediaItem, "media_type" | "file_url" | "metadata_info">> = getMedia,
): Promise<string> {
  if (photo.media_id) {
    const item = await loadMedia(photo.media_id);
    // Pool Assets uploads explicitly use purpose=general. No private files,
    // milestone videos, coach documents or receipts may be publicly approved.
    if (item.media_type.toLowerCase() !== "image" || item.metadata_info?.purpose !== "general") {
      throw new Error("Only public general-purpose uploaded images can be published. Ask an admin to upload an appropriate pool photograph.");
    }
    return validateHttpsPhoto(item.file_url);
  }
  return validateHttpsPhoto(photo.url);
}
