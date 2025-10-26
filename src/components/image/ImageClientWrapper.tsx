"use client";

import { useEffect, useRef, useState } from "react";
import ImageList from "./ImageList";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "./types";
import { toast } from "sonner";
import ImageDropZone from "./ImageDropZone";

export default function ImageClientWrapper({
  initialImages,
  errorMessage,
}: {
  initialImages: Image[];
  errorMessage: string | null;
}) {
  const [images, setImages] = useState<Image[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);

  const hasShownToast = useRef(false);

  useEffect(() => {
    if (errorMessage && !hasShownToast.current) {
      toast.error("Images Fetch Failed", {
        description: "There seems to be an error. Contact support.",
      });
      hasShownToast.current = true;
    }
  }, [errorMessage]);

  // Poll for updates when there are processing images or right after creating a new one
  useEffect(() => {
    const hasProcessingImages = images.some(
      img => img.metadata?.ai_processing_status === 'processing' ||
        img.metadata?.ai_processing_status === 'pending'
    );

    const enablePolling = shouldPoll || hasProcessingImages;
    if (!enablePolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/images');
        if (res.ok) {
          const updatedImages = await res.json();
          setImages(updatedImages);
          // After first successful refresh, we can let hasProcessingImages drive polling
          if (shouldPoll) setShouldPoll(false);
        }
      } catch (error) {
        console.error('Failed to refresh images:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [images, shouldPoll]);

  const handleImageCreated = (newImage: Image) => {
    setLoading(true);
    // Update albums state immutably
    setImages((prev) => [newImage, ...prev]);
    // Start an initial polling cycle so the new image picks up its processing metadata without manual refresh
    setShouldPoll(true);
    setLoading(false);
  };

  const handleImageDelete = (id: string) => {
    setImages((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleImageEdit = (photo: Image) => {
    setImages((prev) => prev.map((a) => (a.id === photo.id ? photo : a)));
  };

  return (
    <Card>

      <div className="p-6 pb-0 mb-4">
        <h1 className="text-2xl md:text-3xl font-semibold">
          My Images
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base"> Uploaded Images will be analyzed by AI to generate descriptions, tags, and dominant colors.</p>
      </div>
      <div className="flex items-center justify-center px-6 mb-4">
        {/* <ImageFormDialog onImageCreate={handleImageCreated} /> */}
        <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible">
          <ImageDropZone onImageCreated={handleImageCreated} />
        </div>
      </div>
      <CardContent>
        <ImageList
          images={images}
          loading={loading}
          onImageEdit={handleImageEdit}
          onImageDelete={handleImageDelete}
        />
      </CardContent>
    </Card>
  );
}
