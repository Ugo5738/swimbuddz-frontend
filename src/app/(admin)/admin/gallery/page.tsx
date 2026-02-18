"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { apiDelete } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import {
  Camera,
  ExternalLink,
  FolderOpen,
  Images,
  Plus,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  media_count?: number;
  photo_count?: number;
  cover_photo?: Photo;
  media_items?: Photo[];
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
  GENERAL: "bg-slate-500/80",
  CLUB: "bg-cyan-500/80",
  COMMUNITY: "bg-purple-500/80",
  SESSION: "bg-blue-500/80",
  EVENT: "bg-pink-500/80",
  ACADEMY: "bg-green-500/80",
  PRODUCT: "bg-orange-500/80",
  MARKETING: "bg-yellow-500/80",
  USER_GENERATED: "bg-indigo-500/80",
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
  USER_GENERATED: "from-indigo-400 to-indigo-600",
};

// Skeleton component for loading state
function AlbumSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
      <div className="aspect-[16/10] bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-56 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-2 pt-2">
          <div className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-9 w-20 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AdminGalleryPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadedCovers, setLoadedCovers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlbums();
  }, []);

  const fetchAlbums = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/media/albums`);
      if (response.ok) {
        const data = await response.json();
        setAlbums(
          data.map((album: any) => ({
            ...album,
            media_count: album.media_count ?? album.photo_count ?? 0,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to fetch albums:", error);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (album: Album) => {
    setAlbumToDelete(album);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setAlbumToDelete(null);
  };

  const confirmDelete = async () => {
    if (!albumToDelete) return;

    setDeleting(true);
    try {
      const token = await getCurrentAccessToken();

      if (!token) {
        alert("You need to be signed in to delete an album");
        return;
      }

      await apiDelete<void>(`/api/v1/media/albums/${albumToDelete.id}`, {
        auth: true,
      });
      setAlbums((prev) => prev.filter((a) => a.id !== albumToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.error("Failed to delete album:", error);
      alert("Failed to delete album");
    } finally {
      setDeleting(false);
    }
  };

  const handleCoverLoad = (albumId: string) => {
    setLoadedCovers((prev) => new Set(prev).add(albumId));
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

  const photoCount = (album: Album) =>
    album.media_count || album.photo_count || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
            <Camera className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Gallery Management
            </h1>
            <p className="text-slate-600 mt-1">
              Manage photo albums and uploads
            </p>
          </div>
        </div>
        <Link
          href="/admin/gallery/create"
          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-3 font-semibold text-white hover:bg-cyan-500 transition-all hover:shadow-lg hover:shadow-cyan-500/25 hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          Create Album
        </Link>
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
              <FolderOpen className="h-12 w-12 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-900">
                No albums created yet
              </h3>
              <p className="text-slate-600 max-w-sm">
                Create your first album to start uploading photos from sessions
                and events.
              </p>
            </div>
            <Link
              href="/admin/gallery/create"
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 text-white font-semibold hover:bg-cyan-500 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create your first album
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {albums.map((album) => {
            const coverUrl = getCoverImage(album);
            const count = photoCount(album);

            return (
              <div
                key={album.id}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100 hover:shadow-lg transition-all duration-300"
              >
                {/* Cover Image */}
                <div
                  className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${albumGradients[album.album_type] || albumGradients.GENERAL}`}
                >
                  {coverUrl ? (
                    <>
                      {/* Loading shimmer */}
                      {!loadedCovers.has(album.id) && (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse" />
                      )}
                      <img
                        src={coverUrl}
                        alt={album.title}
                        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                          loadedCovers.has(album.id)
                            ? "opacity-100"
                            : "opacity-0"
                        }`}
                        onLoad={() => handleCoverLoad(album.id)}
                      />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Camera className="h-16 w-16 text-white/40" />
                    </div>
                  )}

                  {/* Album type badge */}
                  <span
                    className={`absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full text-white backdrop-blur-sm ${albumTypeColors[album.album_type] || albumTypeColors.GENERAL}`}
                  >
                    {albumTypeLabels[album.album_type] || album.album_type}
                  </span>

                  {/* Photo count badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm font-medium">
                    <Images className="h-4 w-4" />
                    <span>{count}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">
                      {album.title}
                    </h3>
                    {album.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {album.description}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/gallery/${album.id}/upload`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-100 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      Upload
                    </Link>
                    <Link
                      href={`/admin/gallery/${album.id}/upload`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Manage
                    </Link>
                    <Link
                      href={`/gallery/${album.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(album)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Delete Album"
      >
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-red-100">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 font-medium">
                Delete &quot;{albumToDelete?.title}&quot;?
              </p>
              <p className="text-sm text-slate-600">
                This will permanently delete this album and all{" "}
                {photoCount(albumToDelete || ({} as Album))} photos inside. This
                action cannot be undone.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={closeDeleteModal}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete Album"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
