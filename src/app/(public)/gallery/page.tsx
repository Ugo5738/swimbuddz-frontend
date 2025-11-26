"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

type Album = {
    id: string;
    title: string;
    description: string | null;
    album_type: string;
    photo_count: number;
    created_at: string;
};

const albumTypeLabels: Record<string, string> = {
    session: "Training Session",
    event: "Community Event",
    academy: "Academy Program",
    general: "General"
};

const albumTypeColors: Record<string, string> = {
    session: "bg-cyan-100 text-cyan-700",
    event: "bg-purple-100 text-purple-700",
    academy: "bg-green-100 text-green-700",
    general: "bg-slate-100 text-slate-700"
};

export default function GalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string | null>(null);

    useEffect(() => {
        fetchAlbums();
    }, [filter]);

    const fetchAlbums = async () => {
        try {
            const url = filter
                ? `/api/media/albums?album_type=${filter}`
                : '/api/media/albums';
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
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <section className="space-y-4">
                <h1 className="text-4xl font-bold text-slate-900">Gallery</h1>
                <p className="text-lg text-slate-600 max-w-3xl">
                    Browse photos from training sessions, community events, and academy programs.
                </p>
            </section>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => setFilter(null)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === null
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                >
                    All Albums
                </button>
                <button
                    onClick={() => setFilter("session")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === "session"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                >
                    Sessions
                </button>
                <button
                    onClick={() => setFilter("event")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === "event"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                >
                    Events
                </button>
                <button
                    onClick={() => setFilter("academy")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === "academy"
                            ? "bg-cyan-600 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                >
                    Academy
                </button>
            </div>

            {/* Albums Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <p className="text-slate-600">Loading albums...</p>
                </div>
            ) : albums.length === 0 ? (
                <Card className="p-12 text-center">
                    <p className="text-slate-600 mb-4">No albums found.</p>
                    <p className="text-sm text-slate-500">
                        Check back soon for photos from upcoming sessions and events!
                    </p>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {albums.map((album) => (
                        <Link key={album.id} href={`/gallery/${album.id}`}>
                            <Card className="h-full space-y-4 hover:shadow-lg transition cursor-pointer">
                                {/* Placeholder image - will show actual cover photo once uploaded */}
                                <div className="aspect-video rounded-lg bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                                    <span className="text-6xl">📸</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-slate-900">{album.title}</h3>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${albumTypeColors[album.album_type]}`}>
                                            {albumTypeLabels[album.album_type]}
                                        </span>
                                    </div>

                                    {album.description && (
                                        <p className="text-sm text-slate-600 line-clamp-2">{album.description}</p>
                                    )}

                                    <p className="text-sm text-slate-500">
                                        {album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}
                                    </p>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
