"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  AlertCircle,
  Check,
  Film,
  GripVertical,
  Image as ImageIcon,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TabType = "banners" | "community" | "videos";

interface MediaAsset {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  title?: string;
  order: number;
}

interface VideoAsset {
  id: string;
  file_url: string;
  title?: string;
  description?: string; // "Name | Role" for testimonials
}

interface VideoTestimonialMeta {
  name: string;
  role: string;
}

export default function AdminHomepageMediaPage() {
  const [activeTab, setActiveTab] = useState<TabType>("banners");
  const [banners, setBanners] = useState<MediaAsset[]>([]);
  const [communityPhotos, setCommunityPhotos] = useState<MediaAsset[]>([]);
  const [galleryVideo, setGalleryVideo] = useState<VideoAsset | null>(null);
  const [videoTestimonials, setVideoTestimonials] = useState<
    (VideoAsset | null)[]
  >([null, null, null]);
  const [testimonialMeta, setTestimonialMeta] = useState<
    VideoTestimonialMeta[]
  >([
    { name: "", role: "" },
    { name: "", role: "" },
    { name: "", role: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSlots, setSavedSlots] = useState<Set<number>>(new Set());
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const communityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const galleryVideoInputRef = useRef<HTMLInputElement>(null);
  const testimonialInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = await getCurrentAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/media/assets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const assets = await response.json();

        // Parse banners
        const bannerAssets = assets
          .filter((a: any) => a.key.startsWith("homepage_banner_"))
          .map((a: any, idx: number) => ({
            id: a.id,
            file_url: a.media_item?.file_url || "",
            thumbnail_url: a.media_item?.thumbnail_url,
            title: a.description || `Banner ${idx + 1}`,
            order: parseInt(a.key.split("_").pop() || "0"),
          }))
          .sort((a: MediaAsset, b: MediaAsset) => a.order - b.order);

        // Parse community photos
        const communityAssets = assets
          .filter((a: any) => a.key.startsWith("community_photo_"))
          .map((a: any) => ({
            id: a.id,
            file_url: a.media_item?.file_url || "",
            thumbnail_url: a.media_item?.thumbnail_url,
            title: a.description || `Photo ${a.key.split("_").pop()}`,
            order: parseInt(a.key.split("_").pop() || "0"),
          }))
          .sort((a: MediaAsset, b: MediaAsset) => a.order - b.order);

        // Parse gallery video
        const galleryVideoAsset = assets.find(
          (a: any) => a.key === "homepage_gallery_video",
        );
        if (galleryVideoAsset?.media_item?.file_url) {
          setGalleryVideo({
            id: galleryVideoAsset.id,
            file_url: galleryVideoAsset.media_item.file_url,
            title: galleryVideoAsset.description || "Gallery Video",
            description: galleryVideoAsset.description,
          });
        } else {
          setGalleryVideo(null);
        }

        // Parse video testimonials (slots 1-3)
        const newTestimonials: (VideoAsset | null)[] = [null, null, null];
        const newMeta: VideoTestimonialMeta[] = [
          { name: "", role: "" },
          { name: "", role: "" },
          { name: "", role: "" },
        ];
        for (let i = 1; i <= 3; i++) {
          const asset = assets.find(
            (a: any) =>
              a.key === `homepage_video_testimonial_${i}`,
          );
          if (asset?.media_item?.file_url) {
            newTestimonials[i - 1] = {
              id: asset.id,
              file_url: asset.media_item.file_url,
              title: asset.description,
              description: asset.description,
            };
            // Parse "Name | Role" from description
            if (asset.description?.includes("|")) {
              const [name, role] = asset.description
                .split("|")
                .map((s: string) => s.trim());
              newMeta[i - 1] = { name: name || "", role: role || "" };
            } else if (asset.description) {
              newMeta[i - 1] = { name: asset.description, role: "" };
            }
          }
        }
        setVideoTestimonials(newTestimonials);
        setTestimonialMeta(newMeta);

        setBanners(bannerAssets);
        setCommunityPhotos(communityAssets);
      }
    } catch (err) {
      console.error("Failed to fetch assets:", err);
      setError("Failed to load media assets");
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (
    file: File,
    assetKey: string,
    title: string,
    isUpdate: boolean = false,
    mediaType: "IMAGE" | "VIDEO" = "IMAGE",
  ) => {
    const token = await getCurrentAccessToken();

    // Upload the media item
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("media_type", mediaType);

    const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload ${mediaType.toLowerCase()}`);
    }

    const mediaItem = await uploadResponse.json();

    // Create or update the site asset
    if (isUpdate) {
      await fetch(`${API_BASE_URL}/api/v1/media/assets/${assetKey}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_item_id: mediaItem.id,
          description: title,
        }),
      });
    } else {
      await fetch(`${API_BASE_URL}/api/v1/media/assets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: assetKey,
          media_item_id: mediaItem.id,
          description: title,
        }),
      });
    }
  };

  // Banner handlers
  const handleBannerUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading("banner");
    setError(null);

    try {
      const nextOrder = banners.length + 1;
      await uploadMedia(
        files[0],
        `homepage_banner_${nextOrder}`,
        `Homepage Banner ${nextOrder}`,
        false,
      );
      await fetchAssets();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  const handleBannerDelete = async (banner: MediaAsset) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;

    try {
      const token = await getCurrentAccessToken();
      await fetch(
        `${API_BASE_URL}/api/v1/media/assets/homepage_banner_${banner.order}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete banner");
    }
  };

  // Community photo handlers
  const handleCommunityUpload = async (
    slot: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    setUploading(`community_${slot}`);
    setError(null);

    try {
      const existingPhoto = communityPhotos.find((p) => p.order === slot);
      await uploadMedia(
        files[0],
        `community_photo_${slot}`,
        `Community Photo ${slot}`,
        !!existingPhoto,
      );
      await fetchAssets();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleCommunityDelete = async (slot: number) => {
    if (!confirm("Are you sure you want to remove this photo?")) return;

    try {
      const token = await getCurrentAccessToken();
      await fetch(
        `${API_BASE_URL}/api/v1/media/assets/community_photo_${slot}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCommunityPhotos((prev) => prev.filter((p) => p.order !== slot));
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete photo");
    }
  };

  // Video handlers
  const handleGalleryVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading("gallery_video");
    setError(null);

    try {
      await uploadMedia(
        files[0],
        "homepage_gallery_video",
        "Homepage Gallery Video",
        !!galleryVideo,
        "VIDEO",
      );
      await fetchAssets();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploading(null);
      if (galleryVideoInputRef.current)
        galleryVideoInputRef.current.value = "";
    }
  };

  const handleGalleryVideoDelete = async () => {
    if (!confirm("Are you sure you want to remove the gallery video?")) return;

    try {
      const token = await getCurrentAccessToken();
      await fetch(
        `${API_BASE_URL}/api/v1/media/assets/homepage_gallery_video`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setGalleryVideo(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete gallery video");
    }
  };

  const handleTestimonialUpload = async (
    slot: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    setUploading(`testimonial_${slot}`);
    setError(null);

    try {
      const meta = testimonialMeta[slot - 1];
      const description = meta.name
        ? `${meta.name}${meta.role ? ` | ${meta.role}` : ""}`
        : `Video Testimonial ${slot}`;

      await uploadMedia(
        files[0],
        `homepage_video_testimonial_${slot}`,
        description,
        !!videoTestimonials[slot - 1],
        "VIDEO",
      );
      await fetchAssets();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleTestimonialDelete = async (slot: number) => {
    if (
      !confirm("Are you sure you want to remove this video testimonial?")
    )
      return;

    try {
      const token = await getCurrentAccessToken();
      await fetch(
        `${API_BASE_URL}/api/v1/media/assets/homepage_video_testimonial_${slot}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setVideoTestimonials((prev) => {
        const next = [...prev];
        next[slot - 1] = null;
        return next;
      });
      setTestimonialMeta((prev) => {
        const next = [...prev];
        next[slot - 1] = { name: "", role: "" };
        return next;
      });
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete video testimonial");
    }
  };

  const handleTestimonialMetaSave = async (slot: number) => {
    const video = videoTestimonials[slot - 1];
    if (!video) return;

    const meta = testimonialMeta[slot - 1];
    const description = meta.name
      ? `${meta.name}${meta.role ? ` | ${meta.role}` : ""}`
      : `Video Testimonial ${slot}`;

    try {
      const token = await getCurrentAccessToken();
      await fetch(
        `${API_BASE_URL}/api/v1/media/assets/homepage_video_testimonial_${slot}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
          }),
        },
      );
      // Show "Saved" indicator briefly
      setSavedSlots((prev) => new Set(prev).add(slot));
      setTimeout(() => {
        setSavedSlots((prev) => {
          const next = new Set(prev);
          next.delete(slot);
          return next;
        });
      }, 2000);
    } catch (err) {
      console.error("Meta save error:", err);
      setError("Failed to save testimonial info");
    }
  };

  const getCommunityPhotoForSlot = (slot: number) =>
    communityPhotos.find((p) => p.order === slot);

  if (loading) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
        <p className="text-lg font-medium text-slate-600">Loading media...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Homepage Media</h1>
        <p className="text-slate-600 mt-1">
          Manage the hero banners, community photos, and videos on the homepage
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("banners")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "banners"
              ? "bg-white text-cyan-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Hero Banners
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "community"
              ? "bg-white text-cyan-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Community Photos
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "videos"
              ? "bg-white text-cyan-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Videos
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Banners Tab */}
      {activeTab === "banners" && (
        <div className="space-y-6">
          {/* Add Banner Button */}
          <div className="flex justify-end">
            <input
              type="file"
              ref={bannerInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => handleBannerUpload(e.target.files)}
            />
            <Button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploading === "banner"}
              className="flex items-center gap-2"
            >
              {uploading === "banner" ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Banner
                </>
              )}
            </Button>
          </div>

          {/* Instructions */}
          <Card className="p-4 bg-cyan-50 border-cyan-200">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="font-medium text-cyan-900">Banner Guidelines</p>
                <ul className="text-sm text-cyan-700 mt-1 space-y-1">
                  <li>• Recommended size: 1920×1080 pixels (16:9 ratio)</li>
                  <li>• Use high-quality swimming/pool images</li>
                  <li>• Images rotate automatically every 5 seconds</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Banners Grid */}
          {banners.length === 0 ? (
            <Card className="p-12 text-center">
              <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No banners yet
              </h3>
              <p className="text-slate-600 mb-4">
                Upload your first homepage banner image.
              </p>
              <Button onClick={() => bannerInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload First Banner
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {banners.map((banner, index) => (
                <Card key={banner.id} className="overflow-hidden group">
                  <div className="relative aspect-video bg-slate-100">
                    {banner.file_url ? (
                      <img
                        src={banner.file_url}
                        alt={banner.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => handleBannerDelete(banner)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded">
                      Slide {index + 1}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">
                        {banner.title || `Banner ${index + 1}`}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Community Photos Tab */}
      {activeTab === "community" && (
        <div className="space-y-6">
          {/* Instructions */}
          <Card className="p-4 bg-cyan-50 border-cyan-200">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="font-medium text-cyan-900">Photo Guidelines</p>
                <ul className="text-sm text-cyan-700 mt-1 space-y-1">
                  <li>• Recommended size: 800×800 pixels (square)</li>
                  <li>
                    • Use photos of swimmers, sessions, or community moments
                  </li>
                  <li>• Photos display in a 3×2 grid on desktop</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Photo Slots Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((slot) => {
              const photo = getCommunityPhotoForSlot(slot);
              const isUploading = uploading === `community_${slot}`;

              return (
                <Card key={slot} className="overflow-hidden">
                  <div className="relative aspect-square bg-slate-100">
                    <input
                      type="file"
                      ref={(el) => {
                        communityInputRefs.current[slot] = el;
                      }}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleCommunityUpload(slot, e.target.files)
                      }
                    />

                    {photo?.file_url ? (
                      <>
                        <img
                          src={photo.file_url || photo.thumbnail_url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            onClick={() =>
                              communityInputRefs.current[slot]?.click()
                            }
                            className="p-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Replace photo"
                          >
                            <Upload className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleCommunityDelete(slot)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Delete photo"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          communityInputRefs.current[slot]?.click()
                        }
                        disabled={isUploading}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-colors"
                      >
                        {isUploading ? (
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                        ) : (
                          <>
                            <Plus className="h-12 w-12" />
                            <span className="text-sm font-medium">
                              Add Photo
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded">
                      Slot {slot}
                    </div>

                    {isUploading && photo?.file_url && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === "videos" && (
        <div className="space-y-8">
          {/* ── Gallery Video ─────────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Gallery Video
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                A short auto-playing video that appears as the first item in the
                community gallery on the homepage.
              </p>
            </div>

            <Card className="p-4 bg-cyan-50 border-cyan-200">
              <div className="flex items-start gap-3">
                <Film className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div>
                  <p className="font-medium text-cyan-900">
                    Gallery Video Guidelines
                  </p>
                  <ul className="text-sm text-cyan-700 mt-1 space-y-1">
                    <li>• Keep it short: 5–10 seconds works best</li>
                    <li>• Square or 16:9 aspect ratio</li>
                    <li>• Plays muted, looped, auto-playing on the homepage</li>
                    <li>• MP4 format recommended</li>
                  </ul>
                </div>
              </div>
            </Card>

            <input
              type="file"
              ref={galleryVideoInputRef}
              accept="video/*"
              className="hidden"
              onChange={(e) => handleGalleryVideoUpload(e.target.files)}
            />

            {galleryVideo ? (
              <Card className="overflow-hidden">
                <div className="relative aspect-video bg-slate-900">
                  <video
                    src={galleryVideo.file_url}
                    controls
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Gallery Video
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Current gallery video
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => galleryVideoInputRef.current?.click()}
                      disabled={uploading === "gallery_video"}
                      className="text-sm"
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Replace
                    </Button>
                    <button
                      onClick={handleGalleryVideoDelete}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-12 text-center">
                <Video className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No gallery video yet
                </h3>
                <p className="text-slate-600 mb-4">
                  Upload a short clip to showcase in the homepage gallery.
                </p>
                <Button
                  onClick={() => galleryVideoInputRef.current?.click()}
                  disabled={uploading === "gallery_video"}
                >
                  {uploading === "gallery_video" ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Gallery Video
                    </>
                  )}
                </Button>
              </Card>
            )}
          </div>

          {/* ── Video Testimonials ────────────────────────────────── */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Video Testimonials
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Short member clips (15–30 seconds) displayed alongside text
                testimonials on the homepage.
              </p>
            </div>

            <Card className="p-4 bg-cyan-50 border-cyan-200">
              <div className="flex items-start gap-3">
                <Film className="h-5 w-5 text-cyan-600 mt-0.5" />
                <div>
                  <p className="font-medium text-cyan-900">
                    Testimonial Video Guidelines
                  </p>
                  <ul className="text-sm text-cyan-700 mt-1 space-y-1">
                    <li>• 15–30 seconds recommended</li>
                    <li>• Include the member&apos;s name and role below</li>
                    <li>• MP4 format, portrait or landscape</li>
                    <li>• These play with controls on the homepage</li>
                  </ul>
                </div>
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((slot) => {
                const video = videoTestimonials[slot - 1];
                const meta = testimonialMeta[slot - 1];
                const isUploading = uploading === `testimonial_${slot}`;

                return (
                  <Card key={slot} className="overflow-hidden">
                    <input
                      type="file"
                      ref={(el) => {
                        testimonialInputRefs.current[slot] = el;
                      }}
                      accept="video/*"
                      className="hidden"
                      onChange={(e) =>
                        handleTestimonialUpload(slot, e.target.files)
                      }
                    />

                    <div className="relative aspect-video bg-slate-900">
                      {video ? (
                        <>
                          <video
                            src={video.file_url}
                            controls
                            preload="metadata"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                testimonialInputRefs.current[slot]?.click()
                              }
                              className="p-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Replace video"
                            >
                              <Upload className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleTestimonialDelete(slot)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Delete video"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() =>
                            testimonialInputRefs.current[slot]?.click()
                          }
                          disabled={isUploading}
                          className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          {isUploading ? (
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                          ) : (
                            <>
                              <Video className="h-12 w-12" />
                              <span className="text-sm font-medium">
                                Add Video
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded">
                        Slot {slot}
                      </div>

                      {isUploading && video && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                        </div>
                      )}
                    </div>

                    {/* Name & Role fields */}
                    <div className="p-4 space-y-3 bg-slate-50">
                      {/* Saved indicator */}
                      {savedSlots.has(slot) && (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium animate-pulse">
                          <Check className="h-3.5 w-3.5" />
                          Saved
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Member Name
                        </label>
                        <input
                          type="text"
                          value={meta.name}
                          onChange={(e) => {
                            const next = [...testimonialMeta];
                            next[slot - 1] = {
                              ...next[slot - 1],
                              name: e.target.value,
                            };
                            setTestimonialMeta(next);
                          }}
                          onBlur={() => handleTestimonialMetaSave(slot)}
                          placeholder="e.g. Uche"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={meta.role}
                          onChange={(e) => {
                            const next = [...testimonialMeta];
                            next[slot - 1] = {
                              ...next[slot - 1],
                              role: e.target.value,
                            };
                            setTestimonialMeta(next);
                          }}
                          onBlur={() => handleTestimonialMetaSave(slot)}
                          placeholder="e.g. Academy Graduate"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Auto-saves when you click away
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
