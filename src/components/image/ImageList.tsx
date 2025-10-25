"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "../ui/card";
import { Eye, MoreHorizontalIcon, Trash2 } from "lucide-react";
import Link from "next/link";
// import EditFormDialog from "./EditFormDialog";
import { Image as ImageType } from "./types";
import Image from "next/image";
import ImagePreviewDialog from "./ImagePreviewDialog";
// import ImageDeleteDialog from "./ImageDeleteDialog";
// import EmptyState from "../EmptyState";

type ImageListProps = {
  images: ImageType[];
  loading: boolean;
  onImageEdit: (image: ImageType) => void;
  onImageDelete: (id: string) => void;
};

export default function ImageList({
  images,
  loading,
  onImageEdit,
  onImageDelete,
}: ImageListProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageType | null>(null);

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
              <div className="action-buttons-div w-full flex justify-end absolute right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="More Options">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedImage(photo);
                          setPreviewOpen(true);
                        }}
                      >
                        <Eye />
                        Preview Image
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <button
                          onClick={() => {
                            // setSelectedId(photo.id);
                            // setOpenModal(true);
                          }}
                          className="flex gap-2 w-full"
                        >
                          <Trash2 color="red" />
                          Delete Image
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="w-full h-0 pb-[100%] relative rounded-md overflow-hidden">
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
                  <h3 className="font-medium text-md truncate">{photo.filename}</h3>
                </div>
                {/* <EditFormDialog photo={photo} onImageEdit={onImageEdit} /> */}
              </div>
            </Card>
          );
        })}
      </div>
      <ImagePreviewDialog
        image={selectedImage}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}
