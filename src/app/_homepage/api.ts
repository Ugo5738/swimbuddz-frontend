// Typed data-fetching helpers for the homepage. Extracted from page.tsx
// during the F5/F6/F7 type-discipline sweep — moves three raw `fetch()`
// calls + ten `: any` callbacks out of the page and into a typed surface.

import { apiGet } from "@/lib/api";
import { MembersApi } from "@/lib/members";

import type { GalleryPhoto, VideoTestimonial } from "./data";

/**
 * Narrow shape of the `GET /api/v1/media/assets` response, scoped to what
 * the homepage actually reads. The full generated shape is in
 * `lib/api-types.ts` (`SiteAssetResponse`); we mirror the fields used here
 * to keep the homepage decoupled from deeply-nested OpenAPI types.
 */
type MediaAsset = {
  id: string;
  key: string;
  description?: string | null;
  media_item?: {
    file_url?: string | null;
    thumbnail_url?: string | null;
  } | null;
};

/**
 * Pluck a trailing numeric ordering hint from an asset key like
 * `homepage_banner_3` → 3. Falls back to 0 so the sort is stable.
 */
function orderingHint(key: string): number {
  return parseInt(key.split("_").pop() || "0", 10);
}

function sortByKeyOrder(a: MediaAsset, b: MediaAsset): number {
  return orderingHint(a.key) - orderingHint(b.key);
}

/**
 * Fetch admin-uploaded hero banner image URLs. Best-effort: failures
 * resolve to `[]` so the page falls back to the static defaults.
 */
export async function fetchHomepageBanners(): Promise<string[]> {
  try {
    const assets = await apiGet<MediaAsset[]>("/api/v1/media/assets");
    return assets
      .filter((a) => a.key.startsWith("homepage_banner_") && a.media_item?.file_url)
      .sort(sortByKeyOrder)
      .map((a) => a.media_item!.file_url!);
  } catch {
    return [];
  }
}

/**
 * Community showcase + gallery video + video testimonials all come from
 * the same `/media/assets` payload — fetch once, slice three ways.
 */
export async function fetchHomepageMedia(): Promise<{
  galleryPhotos: GalleryPhoto[];
  galleryVideo: string | null;
  videoTestimonials: VideoTestimonial[];
}> {
  try {
    const assets = await apiGet<MediaAsset[]>("/api/v1/media/assets");

    const galleryPhotos: GalleryPhoto[] = assets
      .filter((a) => a.key.startsWith("community_photo_") && a.media_item?.file_url)
      .sort(sortByKeyOrder)
      .map((a) => ({
        id: a.id,
        file_url: a.media_item!.file_url!,
        thumbnail_url: a.media_item!.thumbnail_url ?? undefined,
        title: a.description || "SwimBuddz community",
      }));

    const galleryVideoAsset = assets.find(
      (a) => a.key === "homepage_gallery_video" && a.media_item?.file_url,
    );
    const galleryVideo = galleryVideoAsset?.media_item?.file_url ?? null;

    const videoTestimonials: VideoTestimonial[] = assets
      .filter(
        (a) => a.key.startsWith("homepage_video_testimonial_") && a.media_item?.file_url,
      )
      .sort(sortByKeyOrder)
      .map((a) => {
        let name = "SwimBuddz Member";
        let role = "";
        if (a.description?.includes("|")) {
          const parts = a.description.split("|").map((s: string) => s.trim());
          name = parts[0] || name;
          role = parts[1] || "";
        } else if (a.description) {
          name = a.description;
        }
        return {
          id: a.id,
          file_url: a.media_item!.file_url!,
          name,
          role,
        };
      });

    return { galleryPhotos, galleryVideo, videoTestimonials };
  } catch {
    return { galleryPhotos: [], galleryVideo: null, videoTestimonials: [] };
  }
}

/**
 * For each member ID, fetch the public profile and collect any profile
 * photos into a `memberId → photoUrl` map. Per-member failures are
 * swallowed (best-effort), so the page just gets a partial map.
 */
export async function fetchSpotlightPhotoMap(
  memberIds: Iterable<string>,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  await Promise.allSettled(
    Array.from(memberIds).map(async (id) => {
      try {
        const member = await MembersApi.getPublicMember(id);
        if (member.profile_photo_url) {
          map[id] = member.profile_photo_url;
        }
      } catch {
        // ignore per-member failures
      }
    }),
  );
  return map;
}
