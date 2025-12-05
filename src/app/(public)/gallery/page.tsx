"use client";

import { Card } from "@/components/ui/Card";
import { apiEndpoints } from "@/lib/config";
import { Camera, Images } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Photo = {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
};

type Album = {
    id: string;
    title: string;
    description: string | null;
    album_type: string;
    photo_count: number;
    media_count?: number;
    cover_photo?: Photo;
    media_items?: Photo[];
    created_at: string;
};

const albumTypeLabels: Record<string, string> = {
    GENERAL: "General",
    CLUB: "Club",
    COMMUNITY: "Community",
    SESSION: "Session",
    EVENT: "Event",
    ACADEMY: "Academy",
    PRODUCT: "Product",
    MARKETING: "Marketing",
    USER_GENERATED: "User Generated"
};

const albumTypeColors: Record<string, string> = {
    GENERAL: "bg-slate-500/80 text-white",
    CLUB: "bg-cyan-500/80 text-white",
    COMMUNITY: "bg-purple-500/80 text-white",
    SESSION: "bg-blue-500/80 text-white",
    EVENT: "bg-pink-500/80 text-white",
    ACADEMY: "bg-green-500/80 text-white",
    PRODUCT: "bg-orange-500/80 text-white",
    MARKETING: "bg-yellow-500/80 text-white",
    USER_GENERATED: "bg-indigo-500/80 text-white"
};

const albumGradients: Record<string, string> = {
    GENERAL: "from-slate-400 to-slate-600",
    CLUB: "from-cyan-400 to-cyan-600",
    COMMUNITY: "from-purple-400 to-purple-600",
    SESSION: "from-blue-400 to-blue-600",
    EVENT: "from-pink-400 to-pink-600",
    ACADEMY: "from-green-400 to-green-600",
    PRODUCT: "from-orange-400 to-orange-600",
    MARKETING: "from-yellow-400 to-yellow-600",
    USER_GENERATED: "from-indigo-400 to-indigo-600"
};

const filterOptions = [
    { value: null, label: "All Albums" },
    { value: "CLUB", label: "Club" },
    { value: "COMMUNITY", label: "Community" },
    { value: "ACADEMY", label: "Academy" },
    { value: "SESSION", label: "Sessions" },
    { value: "EVENT", label: "Events" },
];

// Skeleton component for loading state
function AlbumSkeleton() {
    return (
        <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="aspect-[4/3] bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
            <div className="p-5 space-y-3">
                <div className="flex justify-between">
                    <div className="h-5 w-32 bg-slate-200 rounded animate-pulse" />
                    <div className="h-5 w-16 bg-slate-200 rounded-full animate-pulse" />
                </div>
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
            </div>
        </div>
    );
}

export default function GalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);
    const [loadedCovers, setLoadedCovers] = useState<Set<string>>(new Set());

    const fetchAlbums = useCallback(async () => {
        try {
            setLoading(true);
            const url = filter
                ? `${apiEndpoints.media}/albums?album_type=${filter}`
                : `${apiEndpoints.media}/albums`;
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setAlbums(data);
            }
        } catch (error) {
            console.error('Failed to fetch albums:', error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchAlbums();
    }, [fetchAlbums]);

    const handleCoverLoad = (albumId: string) => {
        setLoadedCovers(prev => new Set(prev).add(albumId));
    };

    // Get cover image URL for an album
    const getCoverImage = (album: Album): string | null => {
        if (album.cover_photo?.thumbnail_url || album.cover_photo?.file_url) {
            return album.cover_photo.thumbnail_url || album.cover_photo.file_url;
        }
        if (album.media_items && album.media_items.length > 0) {
            const first = album.media_items[0];
            return first.thumbnail_url || first.file_url;
        }
        return null;
    };

    const photoCount = (album: Album) => album.photo_count || album.media_count || 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-300">
            {/* Header */}
            <section className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
                        <Camera className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900">Gallery</h1>
                </div>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Browse photos from training sessions, community events, and academy programs.
                </p>
            </section>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                    <button
                        key={option.value || 'all'}
                        onClick={() => setFilter(option.value)}
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${filter === option.value
                            ? "bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 scale-105"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105"
                            }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {/* Albums Grid */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                        <AlbumSkeleton key={i} />
                    ))}
                </div>
            ) : albums.length === 0 ? (
                <Card className="p-16 text-center bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-cyan-50">
                            <Images className="h-12 w-12 text-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-slate-900">No albums found</h3>
                            <p className="text-slate-600 max-w-sm">
                                {filter
                                    ? `No ${albumTypeLabels[filter] || filter} albums available yet.`
                                    : "Check back soon for photos from upcoming sessions and events!"
                                }
                            </p>
                        </div>
                        {filter && (
                            <button
                                onClick={() => setFilter(null)}
                                className="mt-2 px-6 py-2.5 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
                            >
                                View All Albums
                            </button>
                        )}
                    </div>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {albums.map((album) => {
                        const coverUrl = getCoverImage(album);
                        const count = photoCount(album);

                        return (
                            <Link key={album.id} href={`/gallery/${album.id}`}>
                                <div className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                    {/* Cover Image */}
                                    <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${albumGradients[album.album_type] || albumGradients.GENERAL}`}>
                                        {coverUrl ? (
                                            <>
                                                {/* Loading shimmer */}
                                                {!loadedCovers.has(album.id) && (
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
                                                )}
                                                <img
                                                    src={coverUrl}
                                                    alt={album.title}
                                                    className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${loadedCovers.has(album.id) ? 'opacity-100' : 'opacity-0'
                                                        }`}
                                                    onLoad={() => handleCoverLoad(album.id)}
                                                />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Camera className="h-16 w-16 text-white/40" />
                                            </div>
                                        )}

                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* Album type badge */}
                                        <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm ${albumTypeColors[album.album_type] || albumTypeColors.GENERAL}`}>
                                            {albumTypeLabels[album.album_type] || album.album_type}
                                        </span>

                                        {/* Photo count badge */}
                                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
                                            <Images className="h-4 w-4" />
                                            <span>{count}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 space-y-2">
                                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-600 transition-colors line-clamp-1">
                                            {album.title}
                                        </h3>

                                        {album.description && (
                                            <p className="text-sm text-slate-600 line-clamp-2">{album.description}</p>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
