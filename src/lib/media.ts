import { getCurrentAccessToken } from "./auth";
import { API_BASE_URL } from "./config";

export interface MediaItem {
  id: string;
  media_type: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  alt_text?: string;
  uploaded_by: string;
  is_processed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Upload a file to the media service
 */
export async function uploadMedia(
  file: File,
  purpose: string,
  linkedId?: string,
  title?: string,
  description?: string,
): Promise<MediaItem> {
  const token = await getCurrentAccessToken();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("purpose", purpose);
  if (linkedId) formData.append("linked_id", linkedId);
  if (title) formData.append("title", title);
  if (description) formData.append("description", description);

  const response = await fetch(`${API_BASE_URL}/api/v1/media/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Upload failed with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Register an external URL as a media item
 */
export async function registerMediaUrl(
  url: string,
  purpose: string,
  mediaType: "image" | "video" | "link" = "link",
  title?: string,
  description?: string,
  linkedId?: string,
): Promise<MediaItem> {
  const token = await getCurrentAccessToken();

  const formData = new FormData();
  formData.append("url", url);
  formData.append("purpose", purpose);
  formData.append("media_type", mediaType);
  if (title) formData.append("title", title);
  if (description) formData.append("description", description);
  if (linkedId) formData.append("linked_id", linkedId);

  const response = await fetch(`${API_BASE_URL}/api/v1/media/register-url`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail ||
        `Failed to register URL with status ${response.status}`,
    );
  }

  return response.json();
}

/**
 * Get a media item by ID
 */
export async function getMedia(mediaId: string): Promise<MediaItem> {
  const token = await getCurrentAccessToken();

  const response = await fetch(
    `${API_BASE_URL}/api/v1/media/media/${mediaId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get media with status ${response.status}`);
  }

  return response.json();
}

/**
 * Simple in-memory cache for media URLs
 * Key: mediaId, Value: { url, timestamp }
 */
const mediaUrlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the file URL for a media item by ID (with caching)
 * Returns null if mediaId is null/undefined or if fetch fails
 */
export async function getMediaUrl(
  mediaId: string | null | undefined,
): Promise<string | null> {
  if (!mediaId) return null;

  // Check cache
  const cached = mediaUrlCache.get(mediaId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.url;
  }

  try {
    const media = await getMedia(mediaId);
    const url = media.file_url;

    // Cache the result
    mediaUrlCache.set(mediaId, { url, timestamp: Date.now() });

    return url;
  } catch {
    return null;
  }
}

/**
 * Get the file URL for a media item synchronously from cache
 * Returns null if not in cache - use getMediaUrl to fetch first
 */
export function getMediaUrlFromCache(
  mediaId: string | null | undefined,
): string | null {
  if (!mediaId) return null;
  const cached = mediaUrlCache.get(mediaId);
  return cached ? cached.url : null;
}

/**
 * Prefetch multiple media URLs in parallel
 */
export async function prefetchMediaUrls(
  mediaIds: (string | null | undefined)[],
): Promise<void> {
  const validIds = mediaIds.filter(
    (id): id is string => !!id && !mediaUrlCache.has(id),
  );
  await Promise.all(validIds.map((id) => getMediaUrl(id)));
}
