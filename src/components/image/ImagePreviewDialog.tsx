"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { Image as ImageType } from "./types";
import { Sparkles, Tag, Palette } from "lucide-react";
import { Spinner } from "../ui/spinner";

type Props = {
    image: ImageType | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export default function ImagePreviewDialog({ image, open, onOpenChange }: Props) {
    const [liveImage, setLiveImage] = useState<ImageType | null>(image);
    const metadata = liveImage?.metadata;
    const status = metadata?.ai_processing_status;

    // Best-effort provider detection for display purposes only
    const providerLabel = useMemo(() => {
        const desc = (metadata?.description || "").trim();
        // Detect our known fallback phrasings
        const looksLikeFallback =
            desc.startsWith("A photo of ") ||
            desc === "An image." ||
            desc.startsWith("A detailed photo featuring ");
        if (looksLikeFallback) return "Fallback";

        // Hint from public env flags if provided (optional, for clarity only)
        const openaiOn = (process.env.NEXT_PUBLIC_OPENAI_ENABLED || "").toLowerCase() === "true";
        const bedrockOn = (process.env.NEXT_PUBLIC_BEDROCK_ENABLED || "").toLowerCase() === "true";
        if (openaiOn && !bedrockOn) return "OpenAI";
        if (bedrockOn && !openaiOn) return "Bedrock";
        if (openaiOn && bedrockOn) return "AI"; // either, depending on runtime
        return desc ? "AI" : undefined;
    }, [metadata?.description]);

    // Poll for updated metadata if open and processing
    useEffect(() => {
        setLiveImage(image);
    }, [image]);

    useEffect(() => {
        if (!open || !liveImage?.id) return;
        // Poll whenever analysis is not finalized yet (includes undefined status)
        if (status === "completed" || status === "failed") return;
        let stopped = false;
        const poll = async () => {
            try {
                const res = await fetch(`/api/images?id=${liveImage.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                        setLiveImage(data[0]);
                        if (
                            data[0]?.metadata?.ai_processing_status === "completed" ||
                            data[0]?.metadata?.ai_processing_status === "failed"
                        ) {
                            stopped = true;
                            return;
                        }
                    }
                }
            } catch { }
            if (!stopped) setTimeout(poll, 2000);
        };
        poll();
        return () => {
            stopped = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, liveImage?.id, status]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 w-[95vw] sm:max-w-[95vw] md:max-w-[1200px] my-8 max-h-[90vh] overflow-y-auto">
                <DialogHeader className="px-4 pt-4">
                    <DialogTitle className="truncate">{liveImage?.filename ?? "Preview"}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4 px-4 pb-4">
                    {/* Large image */}
                    <div className="relative w-full h-[50vh] bg-muted rounded-md overflow-hidden">
                        {liveImage && (
                            <Image
                                src={liveImage.original_path}
                                alt={liveImage.filename}
                                fill
                                priority
                                className="object-contain"
                            />
                        )}
                    </div>

                    {/* AI Metadata */}
                    <div className="border rounded-md p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5" />
                            <h3 className="font-medium">AI Analysis</h3>
                        </div>

                        {/* Processing status */}
                        {(status === "pending" || status === "processing") && (
                            <div className="flex items-center gap-2 text-blue-600 mb-4">
                                <Spinner className="w-4 h-4" />
                                <span className="text-sm">AI is analyzing this image...</span>
                            </div>
                        )}

                        {/* Failed status */}
                        {status === "failed" && (
                            <div className="text-red-600 text-sm mb-4">
                                AI analysis failed. Please try again.
                            </div>
                        )}

                        {/* Completed - show metadata */}
                        {status === "completed" && metadata && (
                            <div className="space-y-4">
                                {/* Description */}
                                {metadata.description && (
                                    <div>
                                        <h4 className="text-sm font-medium mb-1">Description</h4>
                                        <p className="text-sm text-muted-foreground">{metadata.description}</p>
                                        {providerLabel && (
                                            <div className="mt-2">
                                                <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                                                    Description source: {providerLabel}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Tags */}
                                {metadata.tags && metadata.tags.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag className="w-4 h-4" />
                                            <h4 className="text-sm font-medium">Tags</h4>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {metadata.tags.map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-md"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Colors */}
                                {metadata.colors && metadata.colors.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Palette className="w-4 h-4" />
                                            <h4 className="text-sm font-medium">Dominant Colors</h4>
                                        </div>
                                        <div className="flex gap-3">
                                            {metadata.colors.map((color, idx) => (
                                                <div key={idx} className="flex flex-col items-center gap-1">
                                                    <div
                                                        className="w-12 h-12 rounded-md border-2 border-gray-300"
                                                        style={{ backgroundColor: color }}
                                                    />
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {color}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* No metadata yet (treat as analyzing to avoid manual refresh) */}
                        {!status && (
                            <div className="flex items-center gap-2 text-blue-600 mb-4">
                                <Spinner className="w-4 h-4" />
                                <span className="text-sm">AI is analyzing this image...</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
