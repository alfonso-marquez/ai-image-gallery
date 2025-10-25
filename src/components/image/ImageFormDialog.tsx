"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { Image } from "./types";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";

const formSchema = z.object({
  filename: z.string().max(20, { message: "Filename must be at most 20 characters" }),
  url: z
    .any()
    .refine((file) => file instanceof File, {
      message: "An image file is required",
    })
    .refine((file) => file?.type?.startsWith("image/"), {
      message: "Only image files are allowed (jpg, png)",
    })
    .refine((file) => file?.size <= 10 * 1024 * 1024, {
      message: "File size must be less than or equal to 10MB",
    }),
});

export default function ImageFormDialog({
  onImageCreate,
}: {
  onImageCreate: (newImage: Image) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filename: "",
      url: undefined,
    },
  });

  const handleCreate = async (values: z.infer<typeof formSchema>) => {
    if (!file) return;
    setIsUploading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const formData = new FormData();
    formData.append("filename", values.filename);
    formData.append("file", file);
    formData.append("user_id", user?.id || "");

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });

      console.log(res);

      if (!res.ok) throw new Error("Image creation failed");
      const newImage = await res.json();
      onImageCreate({ ...newImage, });
      // router.refresh();
      toast.success("Success!", {
        description: "Your photo has been uploaded successfully.",
      });
    } catch {
      toast.error("Image creation failed. Please contact support.");
    } finally {
      setOpen(false);
      form.reset();
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus /> Add Image
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Image</DialogTitle>
          <DialogDescription>
            Add a new album to organize your photos.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-8">
            <FormField
              control={form.control}
              name="filename"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>Title of uploaded photo</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={() => (
                <FormItem>
                  <FormLabel>Upload Photo</FormLabel>
                  <FormControl>
                    <Input
                      id="picture"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setFile(file ?? null);

                        // ✅ update react-hook-form value and trigger validation
                        form.setValue("url", file ?? null, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormDescription>Upload a photo (max 10MB)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isUploading || !file}
              className="mt-4"
            >
              {isUploading ? (
                <>
                  <Spinner />
                  <span>Uploading</span>
                </>
              ) : (
                <span>Upload</span>
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
