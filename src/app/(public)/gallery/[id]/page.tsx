"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PhotoModal } from "@/components/gallery/PhotoModal";

type Photo = {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
    caption: string | null;
    created_at: string;
};

type Album = {
    id: string;
    title: string;
    description: string | null;
    album_type: string;
    photo_count: number;
    photos: Photo[];
};

export default function AlbumDetailPage() {
    const params = useParams();
    const albumId = params?.id as string;

    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number>(0);

    useEffect(() => {
        if (albumId) {
            fetchAlbum();
        }
    }, [albumId]);

    const fetchAlbum = async () => {
        try {
            const response = await fetch(`/api/media/albums/${albumId}`);
            if (response.ok) {
                const data = await response.json();
                setAlbum(data);
            }
        } catch (error) {
            console.error('Failed to fetch album:', error);
        } finally {
            setLoading(false);
        }
    };

    const openPhoto = (photo: Photo, index: number) => {
        setSelectedPhoto(photo);
        setSelectedIndex(index);
    };

    const closePhoto = () => {
        setSelectedPhoto(null);
    };

    const nextPhoto = () => {
        if (album && selectedIndex < album.photos.length - 1) {
            const newIndex = selectedIndex + 1;
            setSelectedIndex(newIndex);
            setSelectedPhoto(album.photos[newIndex]);
        }
    };

    const previousPhoto = () => {
        if (selectedIndex > 0) {
            const newIndex = selectedIndex - 1;
            setSelectedIndex(newIndex);
            setSelectedPhoto(album!.photos[newIndex]);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-600">Loading album...</p>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="space-y-6">
                <Card className="p-12 text-center">
                    <p className="text-slate-600 mb-4">Album not found.</p>
                    <Link href="/gallery" className="text-cyan-700 hover:underline">
                        ← Back to Gallery
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="space-y-4">
                <Link href="/gallery" className="text-sm text-cyan-700 hover:underline">
                    ← Back to Gallery
                </Link>
                <h1 className="text-4xl font-bold text-slate-900">{album.title}</h1>
                {album.description && (
                    <p className="text-lg text-slate-600">{album.description}</p>
                )}
                <p className="text-sm text-slate-500">
                    {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                </p>
            </div>

            {/* Photo Grid */}
            {album.photos.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-slate-600">No photos in this album yet.</p>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {album.photos.map((photo, index) => (
                        <button
                            key={photo.id}
                            onClick={() => openPhoto(photo, index)}
                            className="aspect-square rounded-lg overflow-hidden bg-slate-100 hover:opacity-90 transition cursor-pointer"
                        >
                            <img
                                src={photo.thumbnail_url || photo.file_url}
                                alt={photo.caption || 'Photo'}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Photo Modal */}
            {selectedPhoto && (
                <PhotoModal
                    photo={selectedPhoto}
                    onClose={closePhoto}
                    onNext={selectedIndex < album.photos.length - 1 ? nextPhoto : undefined}
                    onPrevious={selectedIndex > 0 ? previousPhoto : undefined}
                />
            )}
        </div>
    );
}
