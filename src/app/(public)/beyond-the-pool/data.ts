export type Episode = { id: string; title: string; summary: string | null; body: string; video_url?: string | null; episode_number?: number | null; guest_names?: string | null; published_at?: string | null; };
export const EPISODE_CATEGORY = "beyond_the_pool";
export function youtubeId(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"].includes(url.hostname)) return null;
    const id = url.hostname.endsWith("youtu.be") ? url.pathname.slice(1) : url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/") || url.pathname.startsWith("/live/") ? url.pathname.split("/")[2] : url.searchParams.get("v");
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
