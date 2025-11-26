"use client";

import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Photo = {
    id: string;
    file_url: string;
    caption: string | null;
};

type PhotoModalProps = {
    photo: Photo;
    onClose: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
};

export function PhotoModal({ photo, onClose, onNext, onPrevious }: PhotoModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Navigate with arrow keys
    useEffect(() => {
        const handleArrows = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && onPrevious) onPrevious();
            if (e.key === "ArrowRight" && onNext) onNext();
        };
        window.addEventListener("keydown", handleArrows);
        return () => window.removeEventListener("keydown", handleArrows);
    }, [onNext, onPrevious]);

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                aria-label="Close"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Previous Button */}
            {onPrevious && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPrevious();
                    }}
                    className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    aria-label="Previous photo"
                >
                    <ChevronLeft className="h-8 w-8" />
                </button>
            )}

            {/* Photo */}
            <div
                className="relative max-w-6xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={photo.file_url}
                    alt={photo.caption || 'Photo'}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />

                {photo.caption && (
                    <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                        <p className="text-white text-center">{photo.caption}</p>
                    </div>
                )}
            </div>

            {/* Next Button */}
            {onNext && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onNext();
                    }}
                    className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                    aria-label="Next photo"
                >
                    <ChevronRight className="h-8 w-8" />
                </button>
            )}
        </div>
    );
}
