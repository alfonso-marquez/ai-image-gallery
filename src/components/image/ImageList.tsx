"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import {
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Image as ImageType } from "./types";
import Image from "next/image";
import ImagePreviewDialog from "./ImagePreviewDialog";
import { Spinner } from "../ui/spinner";
import { Skeleton } from "../ui/skeleton";

type ImageListProps = {
  images: ImageType[];
  loading: boolean;
  isSearching: boolean;
  activeFilter:
  | { type: "color"; value: string }
  | { type: "similar"; value: string | number }
  | null;
  onImageEdit: (image: ImageType) => void;
  onImageDelete: (id: string) => void;
  onFindSimilar?: (imageId: number | string) => void;
  onFilterByColor?: (hex: string) => void;
};

export default function ImageList({
  images,
  isSearching,
  activeFilter,
  onFindSimilar,
  onFilterByColor,
}: ImageListProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);

  // Keep selected image in sync with latest props so preview updates without manual refresh
  useEffect(() => {
    if (!selectedImage) return;
    const updated = images.find((img) => img.id === selectedImage.id);
    if (updated && updated !== selectedImage) {
      setSelectedImage(updated);
    }
  }, [images, selectedImage]);

  const getAIStatusBadge = (imageId: string, status?: string) => {
    if (!status || status === "pending") {
      return (
        <div className="absolute top-2 left-2 bg-gray-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Pending
        </div>
      );
    }
    if (status === "processing") {
      return (
        <div className="absolute top-2 left-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <Spinner className="w-3 h-3" />
          AI Analyzing...
        </div>
      );
    }
    if (status === "failed") {
      return (
        <div className="absolute top-2 left-2 bg-red-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          AI Failed
        </div>
      );
    }
    return null;
  };

  // if (!loading && images.length === 0) {
  //   return <EmptyState type="photo" />;
  // }

  return (
    <div className="container mx-auto p-6">
      {/* <ImageDeleteDialog
        open={openModal}
        id={selectedId || ""}
        onOpenChange={setOpenModal}
        onImageDelete={onImageDelete}
      /> */}

      {/* Loading skeleton */}
      {isSearching && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <Card key={idx} className="border rounded-md p-4 aspect-square">
              <Skeleton className="w-full h-full rounded-md" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state - no images uploaded yet */}
      {!isSearching && images.length === 0 && !activeFilter && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No images yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Upload your first image to get started.
          </p>
        </div>
      )}

      {/* Empty state for filters */}
      {!isSearching && images.length === 0 && activeFilter && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            No similar images found
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {activeFilter.type === "similar"
              ? "No images with similar tags or descriptions were found. Try uploading more images or selecting a different image."
              : "No images with this color were found."}
          </p>
        </div>
      )}

      {/* Image grid */}
      {!isSearching && images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* {images.length === 0 && <EmptyState type="photo" />} */}
          {images.map((photo) => {
            // const latestImage = photo.images?.sort(
            //   (a, b) =>
            //     new Date(b.created_at).getTime() -
            //     new Date(a.created_at).getTime(),
            // )[0];
            // const coverUrl = latestImage?.url;
            return (
              <Card
                key={photo.id}
                className="border rounded-md flex flex-col items-center justify-between px-4 w-full aspect-square relative"
              >
                <div className="w-full h-0 pb-[100%] relative rounded-md overflow-hidden">
                  {getAIStatusBadge(photo.id, photo.metadata?.ai_processing_status)}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(photo);
                      setPreviewOpen(true);
                    }}
                    className="absolute inset-0"
                    aria-label={`Preview ${photo.filename}`}
                  >
                    <Image
                      src={photo.thumbnail_path || photo.original_path}
                      alt={photo.filename}
                      className="absolute top-0 left-0 w-full h-full object-cover"
                      fill
                      loading="lazy"
                    />
                  </button>
                </div>
                <div className="flex justify-between items-center w-full min-w-0">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-md truncate">
                      {photo.filename}
                    </h3>
                  </div>
                  {/* <EditFormDialog photo={photo} onImageEdit={onImageEdit} /> */}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <ImagePreviewDialog
        image={selectedImage}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onFindSimilar={onFindSimilar}
        onFilterByColor={onFilterByColor}
      />
    </div>
  );
}
