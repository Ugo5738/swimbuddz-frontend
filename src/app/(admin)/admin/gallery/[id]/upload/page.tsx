"use client";

import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { ArrowLeft, Camera, Check, CloudUpload, ExternalLink, Images, Loader2, Trash2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Photo = {
    id: string;
    file_url: string;
    thumbnail_url: string | null;
    title: string | null;
    description: string | null;
    alt_text: string | null;
};

type FilePreview = {
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    progress: number;
};

export default function AlbumUploadPage() {
    const params = useParams();
    const albumId = params?.id as string;

    const [albumTitle, setAlbumTitle] = useState("");
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
    const [caption, setCaption] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    };

    useEffect(() => {
        if (albumId) {
            fetchAlbum();
        }
    }, [albumId]);

    // Cleanup file previews on unmount
    useEffect(() => {
        return () => {
            selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        };
    }, []);

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

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        addFiles(files);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            addFiles(files);
        }
    };

    const addFiles = (files: File[]) => {
        const newPreviews = files.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            status: 'pending' as const,
            progress: 0
        }));
        setSelectedFiles(prev => [...prev, ...newPreviews]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    const clearAllFiles = () => {
        selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setSelectedFiles([]);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0 || selectedFiles.every(f => f.status === 'success')) return;
        if (!albumId) {
            alert("Missing album");
            return;
        }

        setUploading(true);

        try {
            const token = await getAuthToken();
            if (!token) {
                alert("You need to be signed in to upload photos");
                setUploading(false);
                return;
            }

            // Upload each file
            for (let i = 0; i < selectedFiles.length; i++) {
                const filePreview = selectedFiles[i];
                if (filePreview.status === 'success') continue;

                // Update status to uploading
                setSelectedFiles(prev => prev.map((f, idx) =>
                    idx === i ? { ...f, status: 'uploading', progress: 0 } : f
                ));

                const formData = new FormData();
                formData.append('file', filePreview.file);
                formData.append('album_id', albumId);
                formData.append('media_type', 'IMAGE');
                if (caption) formData.append('description', caption);

                try {
                    const response = await fetch(`${API_BASE_URL}/api/v1/media/media`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        body: formData
                    });

                    if (response.ok) {
                        setSelectedFiles(prev => prev.map((f, idx) =>
                            idx === i ? { ...f, status: 'success', progress: 100 } : f
                        ));
                    } else {
                        setSelectedFiles(prev => prev.map((f, idx) =>
                            idx === i ? { ...f, status: 'error', progress: 0 } : f
                        ));
                    }
                } catch {
                    setSelectedFiles(prev => prev.map((f, idx) =>
                        idx === i ? { ...f, status: 'error', progress: 0 } : f
                    ));
                }
            }

            // Refresh photos
            await fetchAlbum();
            setCaption("");

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

    const handleImageLoad = (photoId: string) => {
        setLoadedImages(prev => new Set(prev).add(photoId));
    };

    const successCount = selectedFiles.filter(f => f.status === 'success').length;
    const pendingCount = selectedFiles.filter(f => f.status === 'pending' || f.status === 'error').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-4">
                <Link
                    href="/admin/gallery"
                    className="inline-flex items-center gap-2 text-sm text-cyan-700 hover:text-cyan-600 transition-colors group"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Gallery
                </Link>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25">
                            <Upload className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">{albumTitle || 'Upload Photos'}</h1>
                            <p className="text-slate-600 mt-1">Upload and manage photos for this album</p>
                        </div>
                    </div>

                    <Link
                        href={`/gallery/${albumId}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View Public Gallery
                    </Link>
                </div>
            </div>

            {/* Upload Form */}
            <Card className="p-6 space-y-6">
                <form onSubmit={handleUpload} className="space-y-6">
                    {/* Drag and Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 ${isDragOver
                            ? 'border-cyan-500 bg-cyan-50'
                            : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                            } `}
                    >
                        <input
                            type="file"
                            id="file-input"
                            multiple
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />

                        <div className="flex flex-col items-center gap-4 text-center pointer-events-none">
                            <div className={`p-4 rounded-full transition-colors ${isDragOver ? 'bg-cyan-100' : 'bg-slate-100'} `}>
                                <CloudUpload className={`h-10 w-10 ${isDragOver ? 'text-cyan-600' : 'text-slate-400'} `} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-lg font-semibold text-slate-900">
                                    {isDragOver ? 'Drop images here' : 'Drag and drop images'}
                                </p>
                                <p className="text-sm text-slate-500">
                                    or click to browse from your device
                                </p>
                            </div>
                            <p className="text-xs text-slate-400">
                                Supports JPEG, PNG, GIF, WebP
                            </p>
                        </div>
                    </div>

                    {/* File Previews */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900">
                                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                                    {successCount > 0 && (
                                        <span className="ml-2 text-green-600">
                                            ({successCount} uploaded)
                                        </span>
                                    )}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearAllFiles}
                                    className="text-sm text-slate-500 hover:text-slate-700"
                                >
                                    Clear all
                                </button>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                {selectedFiles.map((filePreview, index) => (
                                    <div
                                        key={index}
                                        className="relative group aspect-square rounded-xl overflow-hidden bg-slate-100"
                                    >
                                        <img
                                            src={filePreview.preview}
                                            alt={filePreview.file.name}
                                            className="w-full h-full object-cover"
                                        />

                                        {/* Status overlay */}
                                        {filePreview.status === 'uploading' && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="h-6 w-6 text-white animate-spin" />
                                            </div>
                                        )}
                                        {filePreview.status === 'success' && (
                                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                                <div className="p-2 rounded-full bg-green-500">
                                                    <Check className="h-4 w-4 text-white" />
                                                </div>
                                            </div>
                                        )}
                                        {filePreview.status === 'error' && (
                                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                                <div className="p-2 rounded-full bg-red-500">
                                                    <X className="h-4 w-4 text-white" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Remove button */}
                                        {filePreview.status !== 'uploading' && filePreview.status !== 'success' && (
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Caption */}
                    <div className="space-y-2">
                        <label htmlFor="caption" className="block text-sm font-semibold text-slate-900">
                            Caption (optional)
                        </label>
                        <input
                            type="text"
                            id="caption"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                            placeholder="Add a caption for all uploaded photos..."
                        />
                    </div>

                    {/* Upload Button */}
                    <button
                        type="submit"
                        disabled={uploading || pendingCount === 0}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3.5 font-semibold text-white hover:bg-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-5 w-5" />
                                Upload {pendingCount > 0 ? `${pendingCount} Photo${pendingCount !== 1 ? 's' : ''} ` : 'Photos'}
                            </>
                        )}
                    </button>
                </form>
            </Card>

            {/* Existing Photos */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-slate-900">Album Photos</h2>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                            {photos.length}
                        </span>
                    </div>
                </div>

                {photos.length === 0 ? (
                    <Card className="p-16 text-center bg-gradient-to-br from-slate-50 to-white">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 rounded-full bg-cyan-50">
                                <Images className="h-12 w-12 text-cyan-400" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-slate-900">No photos yet</h3>
                                <p className="text-slate-600">Use the upload form above to add photos to this album.</p>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {photos.map((photo) => (
                            <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                                {/* Loading placeholder */}
                                {!loadedImages.has(photo.id) && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 animate-pulse flex items-center justify-center">
                                        <Camera className="h-8 w-8 text-slate-300" />
                                    </div>
                                )}

                                <img
                                    src={photo.thumbnail_url || photo.file_url}
                                    alt={photo.title || photo.description || 'Photo'}
                                    className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${loadedImages.has(photo.id) ? 'opacity-100' : 'opacity-0'
                                        } `}
                                    onLoad={() => handleImageLoad(photo.id)}
                                />

                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Actions */}
                                <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                    <div className="flex items-center justify-between">
                                        {(photo.title || photo.description) && (
                                            <p className="text-white text-sm font-medium truncate flex-1 mr-2">
                                                {photo.title || photo.description}
                                            </p>
                                        )}
                                        <button
                                            onClick={() => deletePhoto(photo.id)}
                                            className="p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
