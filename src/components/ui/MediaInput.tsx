'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, Link, X, Check, Loader2 } from 'lucide-react';
import { uploadMedia, registerMediaUrl } from '@/lib/media';

export type MediaInputMode = 'upload-only' | 'url-only' | 'both';

interface MediaInputProps {
    /** The purpose for the upload - determines file validation */
    purpose: 'coach_document' | 'payment_proof' | 'milestone_evidence' | 'profile_photo' | 'cover_image' | 'size_chart' | 'category_image' | 'collection_image' | 'product_image' | 'content_image' | 'general';
    /** Display mode - upload-only shows just upload, both shows tabs */
    mode?: MediaInputMode;
    /** Current media_id value */
    value?: string | null;
    /** Callback when media is uploaded/registered, returns media_id */
    onChange: (mediaId: string | null, fileUrl?: string) => void;
    /** Optional label */
    label?: string;
    /** Accept attribute for file input */
    accept?: string;
    /** Show preview of uploaded image */
    showPreview?: boolean;
    /** Additional class names */
    className?: string;
    /** Disabled state */
    disabled?: boolean;
}

export function MediaInput({
    purpose,
    mode = 'upload-only',
    value,
    onChange,
    label,
    accept,
    showPreview = true,
    className = '',
    disabled = false,
}: MediaInputProps) {
    const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine accept types based on purpose if not provided
    const getAcceptTypes = () => {
        if (accept) return accept;
        switch (purpose) {
            case 'profile_photo':
            case 'cover_image':
                return 'image/*';
            case 'milestone_evidence':
                return 'image/*,video/*';
            case 'coach_document':
            case 'payment_proof':
                return 'image/*,.pdf';
            default:
                return '*/*';
        }
    };

    const handleFileSelect = useCallback(async (file: File) => {
        setError(null);
        setIsUploading(true);

        try {
            const mediaItem = await uploadMedia(file, purpose);

            // Set preview for images
            if (file.type.startsWith('image/')) {
                setPreviewUrl(URL.createObjectURL(file));
            }

            onChange(mediaItem.id, mediaItem.file_url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    }, [purpose, onChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (disabled || isUploading) return;

        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [disabled, isUploading, handleFileSelect]);

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleUrlSubmit = async () => {
        if (!urlInput.trim()) return;

        setError(null);
        setIsUploading(true);

        try {
            const mediaType = urlInput.includes('youtube') || urlInput.includes('youtu.be') ? 'video' : 'link';
            const mediaItem = await registerMediaUrl(urlInput.trim(), purpose, mediaType);

            setPreviewUrl(urlInput);
            onChange(mediaItem.id, mediaItem.file_url);
            setUrlInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to register URL');
        } finally {
            setIsUploading(false);
        }
    };

    const handleClear = () => {
        onChange(null);
        setPreviewUrl(null);
        setUrlInput('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const showTabs = mode === 'both';
    const showUpload = mode === 'upload-only' || mode === 'both';
    const showUrl = mode === 'url-only' || mode === 'both';

    return (
        <div className={`media-input ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {label}
                </label>
            )}

            {/* Tabs */}
            {showTabs && (
                <div className="flex border-b border-gray-200 mb-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'upload'
                            ? 'border-cyan-500 text-cyan-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Upload className="w-4 h-4 inline mr-1" />
                        Upload File
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('url')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'url'
                            ? 'border-cyan-500 text-cyan-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Link className="w-4 h-4 inline mr-1" />
                        Paste URL
                    </button>
                </div>
            )}

            {/* Current value indicator */}
            {value && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">
                        Media uploaded successfully
                    </span>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="text-gray-400 hover:text-gray-600"
                        disabled={disabled}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Preview */}
            {showPreview && previewUrl && !value && (
                <div className="mb-3">
                    {previewUrl.startsWith('blob:') || previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-h-32 rounded-lg object-cover"
                        />
                    ) : (
                        <div className="text-sm text-gray-500 p-2 bg-gray-50 rounded">
                            {previewUrl}
                        </div>
                    )}
                </div>
            )}

            {/* Upload area */}
            {showUpload && (activeTab === 'upload' || !showTabs) && !value && (
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-cyan-400 hover:bg-cyan-50/50'}
            ${error ? 'border-red-300 bg-red-50/50' : 'border-gray-300'}
          `}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptTypes()}
                        onChange={handleFileInputChange}
                        className="hidden"
                        disabled={disabled || isUploading}
                    />

                    {isUploading ? (
                        <div className="flex flex-col items-center">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                            <p className="mt-2 text-sm text-gray-500">Uploading...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <Upload className="w-8 h-8 text-gray-400" />
                            <p className="mt-2 text-sm text-gray-600">
                                Drop file here or <span className="text-cyan-600">browse</span>
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {getAcceptTypes().replace('*/*', 'Any file type')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* URL input area */}
            {showUrl && activeTab === 'url' && !value && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com/image.jpg or YouTube URL"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            disabled={disabled || isUploading}
                        />
                        <button
                            type="button"
                            onClick={handleUrlSubmit}
                            disabled={!urlInput.trim() || disabled || isUploading}
                            className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Add'
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">
                        Enter a direct link to an image, video, or YouTube URL
                    </p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}

export default MediaInput;
