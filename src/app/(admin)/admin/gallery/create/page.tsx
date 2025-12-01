"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

export default function CreateAlbumPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        album_type: "general"
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/media/albums`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const album = await response.json();
                router.push(`/admin/gallery/${album.id}/upload`);
            } else {
                alert('Failed to create album');
            }
        } catch (error) {
            console.error('Failed to create album:', error);
            alert('Failed to create album');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-8">
            {/* Header */}
            <div>
                <Link href="/admin/gallery" className="text-sm text-cyan-700 hover:underline">
                    ← Back to Gallery
                </Link>
                <h1 className="text-3xl font-bold text-slate-900 mt-4">Create Album</h1>
                <p className="text-slate-600 mt-2">Create a new photo album for sessions, events, or general photos</p>
            </div>

            {/* Form */}
            <Card className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="title" className="block text-sm font-semibold text-slate-900">
                            Album Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            placeholder="e.g., Yaba Training Session - Nov 2025"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="description" className="block text-sm font-semibold text-slate-900">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                            placeholder="Optional description of this album"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="album_type" className="block text-sm font-semibold text-slate-900">
                            Album Type *
                        </label>
                        <select
                            id="album_type"
                            required
                            value={formData.album_type}
                            onChange={(e) => setFormData({ ...formData, album_type: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        >
                            <option value="session">Training Session</option>
                            <option value="event">Community Event</option>
                            <option value="academy">Academy Program</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-50"
                        >
                            {submitting ? 'Creating...' : 'Create Album'}
                        </button>
                        <Link
                            href="/admin/gallery"
                            className="flex-1 rounded-lg border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </Card>
        </div>
    );
}
