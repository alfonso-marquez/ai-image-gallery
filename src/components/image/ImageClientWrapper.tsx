"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ImageList from "./ImageList";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Image as ImageType } from "./types";
import { toast } from "sonner";
import ImageDropZone from "./ImageDropZone";
import Image from "next/image";

export default function ImageClientWrapper({
  initialImages,
  errorMessage,
}: {
  initialImages: ImageType[];
  errorMessage: string | null;
}) {
  const [images, setImages] = useState<ImageType[]>(initialImages);
  const [loading, setLoading] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    | { type: "color"; value: string }
    | { type: "similar"; value: string | number }
    | null
  >(null);
  const [similarTargetImage, setSimilarTargetImage] = useState<ImageType | null>(null);

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
      (img) =>
        img.metadata?.ai_processing_status === "processing" ||
        img.metadata?.ai_processing_status === "pending",
    );

    // Disable polling while searching (results are filtered client-side request)
    const enablePolling =
      (shouldPoll || hasProcessingImages) &&
      query.trim().length === 0 &&
      activeFilter === null;
    if (!enablePolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/images");
        if (res.ok) {
          const updatedImages = await res.json();
          setImages(updatedImages);
          // After first successful refresh, we can let hasProcessingImages drive polling
          if (shouldPoll) setShouldPoll(false);
        }
      } catch (error) {
        console.error("Failed to refresh images:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [images, shouldPoll, query, activeFilter]);

  // Debounced instant search
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // If a color/similar filter is active and the query is empty, don't fetch base images.
    if (q.length === 0 && activeFilter) {
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        // Clear any active filter when typing a query
        if (q.length > 0 && activeFilter) setActiveFilter(null);
        const url =
          q.length > 0
            ? `/api/images?q=${encodeURIComponent(q)}`
            : "/api/images";
        console.log("[Search] Fetching:", url);
        const res = await fetch(url);
        console.log("[Search] Response status:", res.status, res.ok);
        if (res.ok) {
          const list = await res.json();
          console.log("[Search] Results:", list);
          setImages(list);
        }
      } catch (e) {
        console.error("[Search] Search failed", e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeFilter]);

  // Handlers: find similar and filter by color
  const handleFindSimilar = async (imageId: number | string) => {
    try {
      setIsSearching(true);
      // Store the target image before filtering
      const targetImg = images.find((img) => String(img.id) === String(imageId));
      setSimilarTargetImage(targetImg || null);
      setActiveFilter({ type: "similar", value: imageId });
      setQuery("");
      const url = `/api/images?similarTo=${encodeURIComponent(String(imageId))}`;
      console.log("[Similar] Fetching:", url);
      const res = await fetch(url);
      console.log("[Similar] Response status:", res.status, res.ok);
      if (res.ok) {
        const list = await res.json();
        console.log("[Similar] Results:", list);
        setImages(list);
      }
    } catch (e) {
      console.error("[Similar] Find similar failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterByColor = async (hex: string) => {
    try {
      setIsSearching(true);
      setActiveFilter({ type: "color", value: hex });
      setQuery("");
      const url = `/api/images?color=${encodeURIComponent(hex)}`;
      console.log("[Color] Fetching:", url);
      const res = await fetch(url);
      console.log("[Color] Response status:", res.status, res.ok);
      if (res.ok) {
        const list = await res.json();
        console.log("[Color] Results:", list);
        setImages(list);
      }
    } catch (e) {
      console.error("[Color] Color filter failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearFilters = async () => {
    try {
      setIsSearching(true);
      setActiveFilter(null);
      setSimilarTargetImage(null);
      setQuery(""); // clear search query as well
      console.log("[Clear] Fetching all images");
      const res = await fetch("/api/images");
      console.log("[Clear] Response status:", res.status, res.ok);
      if (res.ok) {
        const list = await res.json();
        console.log("[Clear] Results:", list);
        setImages(list);
      }
      setShouldPoll(true); // resume polling if needed
    } catch (e) {
      console.error("[Clear] Reset filters failed", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageCreated = (newImage: ImageType) => {
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

  const handleImageEdit = (photo: ImageType) => {
    setImages((prev) => prev.map((a) => (a.id === photo.id ? photo : a)));
  };

  return (
    <Card>
      <div className="p-6 pb-0 mb-4">
        <h1 className="text-2xl md:text-3xl font-semibold">My Images</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          {" "}
          Uploaded Images will be analyzed by AI to generate descriptions, tags,
          and dominant colors.
        </p>
      </div>
      <div className="flex items-center justify-center px-6 mb-4">
        {/* <ImageFormDialog onImageCreate={handleImageCreated} /> */}
        <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible">
          <ImageDropZone onImageCreated={handleImageCreated} />
        </div>
      </div>
      {/* Search + Color filter row */}
      <div className="px-6 mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <Input
          className="w-full sm:flex-1 min-w-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by tag, description, or filename…"
        />
        {/* Color select (shadcn) derived from current images */}
        <Select
          value={
            activeFilter?.type === "color"
              ? String(activeFilter.value)
              : "__clear__"
          }
          onValueChange={(val: string) => {
            if (val === "__clear__") {
              handleClearFilters();
            } else {
              handleFilterByColor(val);
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] shrink-0">
            <SelectValue placeholder="Filter by color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__clear__">All colors</SelectItem>
            {useMemo(() => {
              const freq = new Map<string, number>();
              images.forEach((img) => {
                const arr = (img.metadata?.colors as string[]) || [];
                arr.forEach((raw) => {
                  const norm = (raw || "").toLowerCase();
                  if (!norm) return;
                  const hex = norm.startsWith("#") ? norm : `#${norm}`;
                  freq.set(hex, (freq.get(hex) || 0) + 1);
                });
              });
              return Array.from(freq.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 24)
                .map(([hex]) => hex);
            }, [images]).map((hex) => (
              <SelectItem key={hex} value={hex}>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm border"
                    style={{ background: hex }}
                  />
                  <span className="font-mono">{hex}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full sm:w-auto shrink-0">
          Clear
        </Button>
      </div>
      {activeFilter?.type === "similar" && (
        <div className="px-6 mb-3 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-md border px-2 py-1">
            <span>Similar to:</span>
            {similarTargetImage ? (
              <span className="inline-flex items-center gap-2">
                <Image
                  src={
                    similarTargetImage.thumbnail_path || similarTargetImage.original_path
                  }
                  alt={similarTargetImage.filename}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded object-cover border"
                />
                <span className="font-medium">{similarTargetImage.filename}</span>
              </span>
            ) : (
              <span>#{String(activeFilter.value)}</span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        </div>
      )}
      <CardContent>
        <ImageList
          images={images}
          loading={loading}
          isSearching={isSearching}
          activeFilter={activeFilter}
          onImageEdit={handleImageEdit}
          onImageDelete={handleImageDelete}
          onFindSimilar={handleFindSimilar}
          onFilterByColor={handleFilterByColor}
        />
      </CardContent>
    </Card>
  );
}
