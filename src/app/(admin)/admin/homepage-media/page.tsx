"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { AlertCircle, GripVertical, Image as ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TabType = "banners" | "community";

interface MediaAsset {
    id: string;
    file_url: string;
    thumbnail_url?: string;
    title?: string;
    order: number;
}

export default function AdminHomepageMediaPage() {
    const [activeTab, setActiveTab] = useState<TabType>("banners");
    const [banners, setBanners] = useState<MediaAsset[]>([]);
    const [communityPhotos, setCommunityPhotos] = useState<MediaAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const communityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
        isUpdate: boolean = false
    ) => {
        const token = await getCurrentAccessToken();

        // Upload the media item
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", title);
        formData.append("media_type", "IMAGE");

        const uploadResponse = await fetch(`${API_BASE_URL}/api/v1/media/media`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formData,
        });

        if (!uploadResponse.ok) {
            throw new Error("Failed to upload image");
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
                false
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
            await fetch(`${API_BASE_URL}/api/v1/media/assets/homepage_banner_${banner.order}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setBanners((prev) => prev.filter((b) => b.id !== banner.id));
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete banner");
        }
    };

    // Community photo handlers
    const handleCommunityUpload = async (slot: number, files: FileList | null) => {
        if (!files || files.length === 0) return;

        setUploading(`community_${slot}`);
        setError(null);

        try {
            const existingPhoto = communityPhotos.find(p => p.order === slot);
            await uploadMedia(
                files[0],
                `community_photo_${slot}`,
                `Community Photo ${slot}`,
                !!existingPhoto
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
            await fetch(`${API_BASE_URL}/api/v1/media/assets/community_photo_${slot}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setCommunityPhotos((prev) => prev.filter((p) => p.order !== slot));
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete photo");
        }
    };

    const getCommunityPhotoForSlot = (slot: number) => communityPhotos.find(p => p.order === slot);

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
                    Manage the hero banners and community showcase photos on the homepage
                </p>
            </div>

            {/* Tab Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("banners")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "banners"
                        ? "bg-white text-cyan-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    Hero Banners
                </button>
                <button
                    onClick={() => setActiveTab("community")}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "community"
                        ? "bg-white text-cyan-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                >
                    Community Photos
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
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No banners yet</h3>
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
                                    <li>• Use photos of swimmers, sessions, or community moments</li>
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
                                            ref={(el) => { communityInputRefs.current[slot] = el; }}
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleCommunityUpload(slot, e.target.files)}
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
                                                        onClick={() => communityInputRefs.current[slot]?.click()}
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
                                                onClick={() => communityInputRefs.current[slot]?.click()}
                                                disabled={isUploading}
                                                className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-cyan-600 hover:bg-slate-50 transition-colors"
                                            >
                                                {isUploading ? (
                                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                                                ) : (
                                                    <>
                                                        <Plus className="h-12 w-12" />
                                                        <span className="text-sm font-medium">Add Photo</span>
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
        </div>
    );
}
