"use client";

import { PhotoModal } from "@/components/gallery/PhotoModal";
import { Card } from "@/components/ui/Card";
import { apiEndpoints } from "@/lib/config";
import { ArrowLeft, ImageOff, Images } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Photo = {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  description: string | null;
  created_at: string;
};

type Album = {
  id: string;
  title: string;
  description: string | null;
  album_type: string;
  photo_count: number;
  media_items?: Photo[];
  photos?: Photo[];
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
  USER_GENERATED: "User Generated",
};

const albumTypeColors: Record<string, string> = {
  GENERAL: "bg-slate-100 text-slate-700",
  CLUB: "bg-cyan-100 text-cyan-700",
  COMMUNITY: "bg-purple-100 text-purple-700",
  SESSION: "bg-blue-100 text-blue-700",
  EVENT: "bg-pink-100 text-pink-700",
  ACADEMY: "bg-green-100 text-green-700",
  PRODUCT: "bg-orange-100 text-orange-700",
  MARKETING: "bg-yellow-100 text-yellow-700",
  USER_GENERATED: "bg-indigo-100 text-indigo-700",
};

// Skeleton component for loading state
function PhotoSkeleton() {
  return (
    <div className="aspect-square rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
  );
}

export default function AlbumDetailPage() {
  const params = useParams();
  const albumId = params?.id as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (albumId) {
      fetchAlbum();
    }
  }, [albumId]);

  const fetchAlbum = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await fetch(`${apiEndpoints.media}/albums/${albumId}`);
      if (response.ok) {
        const data = await response.json();
        setAlbum(data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to fetch album:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const photos = album?.media_items || album?.photos || [];

  const openPhoto = (photo: Photo, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
  };

  const nextPhoto = () => {
    if (selectedIndex < photos.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  const previousPhoto = () => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedPhoto(photos[newIndex]);
    }
  };

  const handleImageLoad = (photoId: string) => {
    setLoadedImages((prev) => new Set(prev).add(photoId));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-10 w-72 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        {/* Photo grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <PhotoSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // Error or not found state
  if (error || !album) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
        </Link>
        <Card className="p-16 text-center bg-gradient-to-br from-slate-50 to-white">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-slate-100">
              <ImageOff className="h-12 w-12 text-slate-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">
                Album not found
              </h2>
              <p className="text-slate-600 max-w-sm">
                This album may have been removed or the link is incorrect.
              </p>
            </div>
            <Link
              href="/gallery"
              className="mt-4 px-6 py-2.5 rounded-full bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
            >
              Browse Gallery
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-4">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Gallery
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-bold text-slate-900">{album.title}</h1>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${albumTypeColors[album.album_type] || albumTypeColors.GENERAL}`}
          >
            {albumTypeLabels[album.album_type] || album.album_type}
          </span>
        </div>

        {album.description && (
          <p className="text-lg text-slate-600 max-w-3xl">
            {album.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Images className="h-4 w-4" />
          <span>
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
          </span>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <Card className="p-16 text-center bg-gradient-to-br from-slate-50 to-white">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-cyan-50">
              <Images className="h-12 w-12 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">
                No photos yet
              </h3>
              <p className="text-slate-600">
                Photos will appear here once they&apos;re uploaded.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => openPhoto(photo, index)}
              className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              {/* Loading placeholder */}
              {!loadedImages.has(photo.id) && (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
              )}

              <img
                src={photo.thumbnail_url || photo.file_url}
                alt={photo.caption || photo.description || "Photo"}
                className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
                  loadedImages.has(photo.id) ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => handleImageLoad(photo.id)}
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Caption on hover */}
              {(photo.caption || photo.description) && (
                <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-white text-sm font-medium line-clamp-2">
                    {photo.caption || photo.description}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal
          photo={selectedPhoto}
          onClose={closePhoto}
          onNext={selectedIndex < photos.length - 1 ? nextPhoto : undefined}
          onPrevious={selectedIndex > 0 ? previousPhoto : undefined}
          currentIndex={selectedIndex}
          totalCount={photos.length}
        />
      )}
    </div>
  );
}
