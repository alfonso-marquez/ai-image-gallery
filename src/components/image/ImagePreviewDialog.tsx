"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { Image as ImageType } from "./types";

type Props = {
    image: ImageType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ImagePreviewDialog({ image, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 w-[95vw] sm:max-w-[95vw] md:max-w-[1200px]">
                <DialogHeader className="px-4 pt-4">
                    <DialogTitle className="truncate">{image?.filename ?? "Preview"}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 p-4">
                    {/* Large image */}
                    <div className="relative w-full h-[50vh] md:h-[70vh] bg-muted rounded-md overflow-hidden">
                        {image && (
                            <Image
                                src={image.original_path}
                                alt={image.filename}
                                fill
                                priority
                                className="object-contain"
                            />
                        )}
                    </div>

                    {/* Metadata placeholder (to be implemented later) */}
                    <div className="">
                        <div className="border rounded-md p-4 h-full min-h-[200px]">
                            <h3 className="font-medium mb-2">Details</h3>
                            <p className="text-sm text-muted-foreground">
                                Image metadata (tags, description, colors) will appear here once implemented.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
