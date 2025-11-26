"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

type Album = {
    id: string;
    title: string;
    description: string | null;
    album_type: string;
    photo_count: number;
};

export default function AdminGalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAlbums();
    }, []);

    const fetchAlbums = async () => {
        try {
            const response = await fetch('/api/media/albums');
            if (response.ok) {
                const data = await response.json();
                setAlbums(data);
            }
        } catch (error) {
            console.error('Failed to fetch albums:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteAlbum = async (albumId: string) => {
        if (!confirm('Are you sure you want to delete this album and all its photos?')) {
            return;
        }

        try {
            const response = await fetch(`/api/media/albums/${albumId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setAlbums(albums.filter(a => a.id !== albumId));
            } else {
                alert('Failed to delete album');
            }
        } catch (error) {
            console.error('Failed to delete album:', error);
            alert('Failed to delete album');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Gallery Management</h1>
                    <p className="text-slate-600 mt-2">Manage photo albums and uploads</p>
                </div>
                <Link
                    href="/admin/gallery/create"
                    className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition"
                >
                    Create Album
                </Link>
            </div>

            {/* Albums List */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600">Loading albums...</p>
                </div>
            ) : albums.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-slate-600 mb-4">No albums created yet.</p>
                    <Link
                        href="/admin/gallery/create"
                        className="inline-block text-cyan-700 hover:underline font-semibold"
                    >
                        Create your first album →
                    </Link>
                </Card>
            ) : (
                <div className="space-y-4">
                    {albums.map((album) => (
                        <Card key={album.id} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-semibold text-slate-900">{album.title}</h3>
                                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                                            {album.album_type}
                                        </span>
                                    </div>
                                    {album.description && (
                                        <p className="text-sm text-slate-600">{album.description}</p>
                                    )}
                                    <p className="text-sm text-slate-500">
                                        {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Link
                                        href={`/admin/gallery/${album.id}/upload`}
                                        className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 transition"
                                    >
                                        Upload Photos
                                    </Link>
                                    <Link
                                        href={`/admin/gallery/${album.id}`}
                                        className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                                    >
                                        Manage
                                    </Link>
                                    <button
                                        onClick={() => deleteAlbum(album.id)}
                                        className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
