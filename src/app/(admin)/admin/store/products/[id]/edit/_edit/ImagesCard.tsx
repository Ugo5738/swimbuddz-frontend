"use client";

import { MediaInput } from "@/components/ui/MediaInput";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import Image from "next/image";

import { SortableImageWrapper } from "../components";
import type { ProductImage, Variant } from "../types";

type Props = {
  images: ProductImage[];
  variants: Variant[];
  showImageForm: boolean;
  setShowImageForm: (value: boolean) => void;
  savingImage: boolean;
  deletingImageId: string | null;
  replacingImageId: string | null;
  setReplacingImageId: (id: string | null) => void;
  linkingImageId: string | null;
  setLinkingImageId: (id: string | null) => void;
  onImageUploaded: (mediaId: string | null, fileUrl?: string) => Promise<void>;
  onReplaceImage: (mediaId: string | null, fileUrl?: string) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
  onLinkImageToVariant: (imageId: string, variantId: string | null) => Promise<void>;
  onImageDragEnd: (event: DragEndEvent) => Promise<void>;
};

export function ImagesCard({
  images,
  variants,
  showImageForm,
  setShowImageForm,
  savingImage,
  deletingImageId,
  replacingImageId,
  setReplacingImageId,
  linkingImageId,
  setLinkingImageId,
  onImageUploaded,
  onReplaceImage,
  onDeleteImage,
  onSetPrimary,
  onLinkImageToVariant,
  onImageDragEnd,
}: Props) {
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-slate-900">
          Images <span className="text-slate-400 font-normal">({images.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowImageForm(!showImageForm)}
          className="text-xs px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100 font-medium"
        >
          {showImageForm ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add Image via MediaInput (upload or URL) */}
      {showImageForm && (
        <div className="mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-lg">
          {savingImage ? (
            <p className="text-sm text-slate-500 text-center py-2">Saving to product...</p>
          ) : (
            <MediaInput
              purpose="product_image"
              mode="both"
              onChange={onImageUploaded}
              showPreview={false}
            />
          )}
        </div>
      )}

      {/* Existing Images */}
      {images.length === 0 ? (
        <p className="text-sm text-slate-500">No images yet.</p>
      ) : (
        <DndContext
          sensors={dndSensors}
          collisionDetection={closestCenter}
          onDragEnd={onImageDragEnd}
        >
          <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => {
                const linkedVariant = img.variant_id
                  ? variants.find((v) => v.id === img.variant_id)
                  : null;
                const linkedColorName = linkedVariant?.options?.Color || linkedVariant?.name;
                return (
                  <SortableImageWrapper key={img.id} id={img.id}>
                    <div className="relative aspect-square w-full group rounded-lg overflow-hidden border border-slate-200">
                      <Image
                        src={img.url}
                        alt={img.alt_text || "Product image"}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover"
                      />
                      {img.is_primary && (
                        <span className="absolute top-7 left-1 text-[10px] px-1.5 py-0.5 bg-cyan-600 text-white rounded font-medium">
                          Primary
                        </span>
                      )}

                      {/* Variant link badge */}
                      {linkedColorName && linkingImageId !== img.id && (
                        <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-purple-600 text-white rounded font-medium max-w-[calc(100%-2.5rem)] truncate">
                          {linkedColorName}
                        </span>
                      )}

                      {/* Action buttons (hover) */}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!img.is_primary && (
                          <button
                            type="button"
                            onClick={() => onSetPrimary(img.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-700/70 text-white hover:bg-amber-500 text-[10px]"
                            title="Set as primary image"
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setReplacingImageId(replacingImageId === img.id ? null : img.id)
                          }
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
                            replacingImageId === img.id
                              ? "bg-blue-500 text-white"
                              : "bg-slate-700/70 text-white hover:bg-blue-500"
                          }`}
                          title="Replace image"
                        >
                          ↻
                        </button>
                        {variants.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setLinkingImageId(linkingImageId === img.id ? null : img.id)
                            }
                            className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
                              linkingImageId === img.id
                                ? "bg-purple-500 text-white"
                                : "bg-slate-700/70 text-white hover:bg-purple-500"
                            }`}
                            title="Link to variant"
                          >
                            🔗
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteImage(img.id)}
                          disabled={deletingImageId === img.id}
                          className="w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs hover:bg-red-600 disabled:opacity-50"
                          title="Remove image"
                        >
                          {deletingImageId === img.id ? "..." : "×"}
                        </button>
                      </div>

                      {/* Replace image panel */}
                      {replacingImageId === img.id && (
                        <div className="absolute inset-x-0 bottom-0 bg-white/95 border-t border-slate-200 p-2">
                          {savingImage ? (
                            <p className="text-[11px] text-slate-500 text-center py-1">
                              Replacing...
                            </p>
                          ) : (
                            <MediaInput
                              purpose="product_image"
                              mode="both"
                              onChange={onReplaceImage}
                              showPreview={false}
                            />
                          )}
                        </div>
                      )}

                      {/* Variant linking dropdown */}
                      {linkingImageId === img.id && (
                        <div className="absolute inset-x-0 bottom-0 bg-white/95 border-t border-slate-200 p-1.5 space-y-0.5 max-h-32 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => onLinkImageToVariant(img.id, null)}
                            className={`w-full text-left text-[11px] px-2 py-1 rounded hover:bg-slate-100 ${
                              !img.variant_id
                                ? "font-semibold text-slate-900"
                                : "text-slate-600"
                            }`}
                          >
                            No variant (unlinked)
                          </button>
                          {variants.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => onLinkImageToVariant(img.id, v.id)}
                              className={`w-full text-left text-[11px] px-2 py-1 rounded hover:bg-purple-50 ${
                                img.variant_id === v.id
                                  ? "font-semibold text-purple-700 bg-purple-50"
                                  : "text-slate-600"
                              }`}
                            >
                              {v.options?.Color || v.name || v.sku}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </SortableImageWrapper>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
