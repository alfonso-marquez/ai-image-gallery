'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from '@/utils/supabase/client'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Image } from './types'

interface ImageDropZoneProps {
    onImageCreated?: (image: Image) => void;
}

export default function ImageDropZone({ onImageCreated }: ImageDropZoneProps) {
    // Helper: generate 300x300 thumbnail blob from a File
    const generateThumbnail = async (file: File, size = 300): Promise<Blob> => {
        const img = await createImageBitmap(file)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        // cover fit
        const scale = Math.max(size / img.width, size / img.height)
        const newW = img.width * scale
        const newH = img.height * scale
        const dx = (size - newW) / 2
        const dy = (size - newH) / 2
        ctx.clearRect(0, 0, size, size)
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, dx, dy, newW, newH)

        const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        const quality = type === 'image/jpeg' ? 0.85 : undefined
        const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Failed to create thumbnail'))), type, quality)
        })
        return blob
    }
    const props = useSupabaseUpload({
        bucketName: process.env.NEXT_PUBLIC_SUPABASE_BUCKET!,
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxFiles: 3,
        maxFileSize: 1000 * 1000 * 10, // 10MB
    });

    // When upload is successful, create database records
    useEffect(() => {
        const createImageRecords = async () => {
            if (props.isSuccess && props.successes.length > 0) {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    console.error('No user logged in');
                    return;
                }

                const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!;

                try {
                    for (const successFileName of props.successes) {
                        const file = props.files.find(f => f.name === successFileName);
                        if (!file) continue;

                        // Get the uploaded file path from the hook
                        const filePath = props.uploadedPaths.get(file.name);
                        if (!filePath) {
                            console.error(`No uploaded path found for ${file.name}`);
                            continue;
                        }

                        // Generate and upload thumbnail (300x300) under thumbnails folder with same filename
                        const thumbnailBlob = await generateThumbnail(file, 300)
                        const thumbnailPath = filePath.replace('/originals/', '/thumbnails/')
                        const { error: thumbUploadError } = await supabase.storage
                            .from(bucket)
                            .upload(thumbnailPath, thumbnailBlob, { upsert: false, contentType: thumbnailBlob.type })
                        if (thumbUploadError) {
                            console.error('Thumbnail upload failed:', thumbUploadError.message)
                        }

                        // Get public URLs using the actual uploaded paths
                        const { data: publicUrlData } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(filePath);
                        const { data: thumbPublicUrlData } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(thumbnailPath);

                        // Create image record via API
                        const res = await fetch('/api/images', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                filename: file.name,
                                original_path: publicUrlData.publicUrl,
                                thumbnail_path: thumbPublicUrlData.publicUrl
                            })
                        });

                        const data = await res.json();

                        if (!res.ok) {
                            throw new Error(data.error || 'Failed to create image record');
                        }

                        // Call the callback to update parent state
                        if (onImageCreated) {
                            onImageCreated(data);
                        }
                    }

                    toast.success('Upload successful', {
                        description: `${props.successes.length} image(s) uploaded successfully`,
                    });
                } catch (err) {
                    toast.error('Failed to create image records', {
                        description: err instanceof Error ? err.message : 'Something went wrong',
                    });
                }
            }
        };

        createImageRecords();
    }, [props.isSuccess, props.successes.length]); // Only run when upload completes

    return (
        <div className="w-full min-w-0 sm:max-w-[420px] md:max-w-[500px]">
            <Dropzone {...props} className="min-h-[150px] min-w-[300px]">
                <DropzoneEmptyState />
                <DropzoneContent />
            </Dropzone>
        </div>
    )
}