"use client";

import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Photo = {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
    title: string | null;
    description: string | null;
    alt_text: string | null;
};

export default function AlbumUploadPage() {
    const params = useParams();
    const albumId = params?.id as string;

    const [albumTitle, setAlbumTitle] = useState("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [caption, setCaption] = useState("");

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    useEffect(() => {
        if (albumId) {
            fetchAlbum();
        }
    }, [albumId]);

    const fetchAlbum = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/media/albums/${albumId}`);
            if (response.ok) {
                const data = await response.json();
                setAlbumTitle(data.title);
                setPhotos(data.media_items || []);
            }
        } catch (error) {
            console.error('Failed to fetch album:', error);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles(e.target.files);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFiles || selectedFiles.length === 0) return;
        if (!albumId) {
            alert("Missing album");
            return;
        }

        setUploading(true);

        try {
            const token = await getAuthToken();
            if (!token) {
                alert("You need to be signed in to upload photos");
                return;
            }

            // Upload each file
            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const formData = new FormData();
                formData.append('file', file);
                formData.append('album_id', albumId);
                formData.append('media_type', 'IMAGE');
                if (caption) formData.append('description', caption);

                // Backend endpoint is /api/v1/media/media for uploads (router prefix + /media)
                const response = await fetch(`${API_BASE_URL}/api/v1/media/media`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    console.error(`Failed to upload ${file.name}`);
                }
            }

            // Refresh photos
            await fetchAlbum();

            // Reset form
            setSelectedFiles(null);
            setCaption("");
            const fileInput = document.getElementById('file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload photos');
        } finally {
            setUploading(false);
        }
    };

    const deletePhoto = async (photoId: string) => {
        if (!confirm('Are you sure you want to delete this photo?')) return;

        try {
            const token = await getAuthToken();
            if (!token) {
                alert("You need to be signed in to delete a photo");
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/media/media/${photoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setPhotos(photos.filter(p => p.id !== photoId));
            } else {
                alert('Failed to delete photo');
            }
        } catch (error) {
            console.error('Failed to delete photo:', error);
            alert('Failed to delete photo');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <Link href="/admin/gallery" className="text-sm text-cyan-700 hover:underline">
                    ← Back to Gallery
                </Link>
                <h1 className="text-3xl font-bold text-slate-900 mt-4">
                    Upload Photos: {albumTitle}
                </h1>
                <p className="text-slate-600 mt-2">Upload and manage photos for this album</p>
            </div>

            {/* Upload Form */}
            <Card className="p-6">
                <form onSubmit={handleUpload} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="file-input" className="block text-sm font-semibold text-slate-900">
                            Select Photos *
                        </label>
                        <input
                            type="file"
                            id="file-input"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            required
                        />
                        {selectedFiles && selectedFiles.length > 0 && (
                            <p className="text-sm text-slate-600">
                                {selectedFiles.length} file(s) selected
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="caption" className="block text-sm font-semibold text-slate-900">
                            Caption (optional, applies to all uploaded photos)
                        </label>
                        <input
                            type="text"
                            id="caption"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            placeholder="e.g., Training session at Yaba"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={uploading || !selectedFiles}
                        className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : 'Upload Photos'}
                    </button>
                </form>
            </Card>

            {/* Existing Photos */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Album Photos ({photos.length})</h2>
                    <Link
                        href={`/gallery/${albumId}`}
                        className="text-sm text-cyan-700 hover:underline"
                        target="_blank"
                    >
                        View Public Gallery →
                    </Link>
                </div>

                {photos.length === 0 ? (
                    <Card className="p-12 text-center">
                        <p className="text-slate-600">No photos uploaded yet. Use the form above to upload.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => (
                            <div key={photo.id} className="relative group">
                                <img
                                    src={photo.thumbnail_url || photo.file_url}
                                    alt={photo.title || photo.description || 'Photo'}
                                    className="aspect-square w-full rounded-lg object-cover"
                                />

                                {/* Overlay with actions */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex flex-col items-center justify-center gap-2 p-2">
                                    <button
                                        onClick={() => deletePhoto(photo.id)}
                                        className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                                    >
                                        Delete
                                    </button>
                                </div>

                                {(photo.title || photo.description) && (
                                    <p className="text-xs text-slate-600 mt-1 truncate">{photo.title || photo.description}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
