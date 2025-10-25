"use client";

import { useEffect, useRef, useState } from "react";
// import ImageFormDialog from "./ImageFormDialog";
import ImageList from "./ImageList";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "./types";
import { toast } from "sonner";
import ImageFormDialog from "./ImageFormDialog";
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
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

  const hasShownToast = useRef(false);

  useEffect(() => {
    if (errorMessage && !hasShownToast.current) {
      toast.error("Images Fetch Failed", {
        description: "There seems to be an error. Contact support.",
      });
      hasShownToast.current = true;
    }
  }, [errorMessage]);

  const handleImageCreated = (newImage: Image) => {
    setLoading(true);
    // Update albums state immutably
    setImages((prev) => [newImage, ...prev]);
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
        <p className="text-muted-foreground text-sm sm:text-base"> Upload and manage your images </p>
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
