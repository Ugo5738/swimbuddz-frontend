"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Photo = {
  id: string;
  file_url: string;
  caption: string | null;
  description?: string | null;
};

type PhotoModalProps = {
  photo: Photo;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex?: number;
  totalCount?: number;
};

export function PhotoModal({
  photo,
  onClose,
  onNext,
  onPrevious,
  currentIndex,
  totalCount,
}: PhotoModalProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Reset states when photo changes
  useEffect(() => {
    setIsLoaded(false);
    setIsZoomed(false);
  }, [photo.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft" && onPrevious) {
        onPrevious();
      } else if (e.key === "ArrowRight" && onNext) {
        onNext();
      } else if (e.key === " " || e.key === "z") {
        e.preventDefault();
        setIsZoomed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNext, onPrevious]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isZoomed) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isZoomed) return;
    if (touchStartX.current === null || touchEndX.current === null) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (diff > threshold && onNext) {
      onNext();
    } else if (diff < -threshold && onPrevious) {
      onPrevious();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const caption = photo.caption || photo.description;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Top bar with close and counter */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        {/* Photo counter */}
        {typeof currentIndex === "number" && typeof totalCount === "number" && (
          <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
            <span className="text-white text-sm font-medium">
              {currentIndex + 1} / {totalCount}
            </span>
          </div>
        )}

        {/* Spacer if no counter */}
        {(typeof currentIndex !== "number" ||
          typeof totalCount !== "number") && <div />}

        {/* Close and zoom buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsZoomed((prev) => !prev)}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
          >
            {isZoomed ? (
              <ZoomOut className="h-5 w-5" />
            ) : (
              <ZoomIn className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Previous Button */}
      {onPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-sm z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Photo Container */}
      <div
        className={`relative flex flex-col items-center max-w-[90vw] max-h-[85vh] transition-transform duration-300 ${
          isVisible ? "scale-100" : "scale-95"
        } ${isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsZoomed((prev) => !prev);
        }}
      >
        {/* Loading spinner */}
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        <img
          src={photo.file_url}
          alt={caption || "Photo"}
          className={`max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl transition-all duration-300 ${
            isZoomed ? "scale-150 cursor-zoom-out" : "scale-100"
          } ${isLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setIsLoaded(true)}
          draggable={false}
        />

        {/* Caption */}
        {caption && isLoaded && (
          <div
            className={`mt-4 px-6 py-3 bg-white/10 rounded-xl backdrop-blur-sm max-w-2xl transition-all duration-300 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
          >
            <p className="text-white text-center text-sm md:text-base">
              {caption}
            </p>
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
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110 backdrop-blur-sm z-10"
          aria-label="Next photo"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 text-white/50 text-xs">
        <span>← → Navigate</span>
        <span>Space/Z Zoom</span>
        <span>Esc Close</span>
      </div>
    </div>
  );
}
