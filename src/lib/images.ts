// Fetch all images
import { createClient } from "@/utils/supabase/server";

const getImages = async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .select(
      `
      *,
      metadata:image_metadata(*)
    `,
    )
    .eq("user_id", id)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error?.message || "Failed to fetch images");

  // Transform the data to match our Image type (metadata is an array, we want single object)
  const transformedData = data?.map((image) => ({
    ...image,
    metadata: image.metadata?.[0] || null,
  }));

  return transformedData || []; // always return array, safe for UI
};

// GET single image by id
const getImage = async (id: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .select()
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return { data: null, error: error.message || "404 Not Found" };
    } else {
      return { data: null, error: error.message || "Internal Server Error" };
    }
  }
  console.log(data);
  return { data, error: null };
};

const createImage = async (
  filename: string,
  original_path: string,
  userId: string,
  thumbnail_path?: string,
) => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("images")
    .insert({ filename, original_path, user_id: userId, thumbnail_path })
    .select()
    .single();
  if (error) throw new Error(error?.message || "Failed to create image");
  console.log("Service layer:", data);
  return data || []; // return array of created images
};

const updateImage = async (id: number, name: string, description: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .update({ name, description, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      `id,
      name,
      description,
      image_metadata (
        id,
        url,
        created_at
      )`,
    )
    .single();
  if (error)
    throw new Error(error.message || `Failed to update image with id ${id}`);
  return data || []; // return array of updated images
};

const deleteImage = async (id: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("images")
    .delete()
    .eq("id", id)
    .select();
  if (error)
    throw new Error(error?.message || `Failed to delete image with id ${id}`);
  return data || []; // return array of deleted images
};

// === Image Metadata Functions ===

const createMetadata = async (
  imageId: number,
  userId: string,
  description: string,
  tags: string[],
  colors: string[],
  status: string = "completed",
) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("image_metadata")
    .insert({
      image_id: imageId,
      user_id: userId,
      description,
      tags,
      colors,
      ai_processing_status: status,
    })
    .select()
    .single();

  if (error) throw new Error(error?.message || "Failed to create metadata");
  return data;
};

const getMetadata = async (imageId: number) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("image_metadata")
    .select()
    .eq("image_id", imageId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No metadata found
    }
    throw new Error(error?.message || "Failed to fetch metadata");
  }
  return data;
};

const updateMetadataStatus = async (imageId: number, status: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("image_metadata")
    .update({ ai_processing_status: status })
    .eq("image_id", imageId)
    .select()
    .single();

  if (error)
    throw new Error(error?.message || "Failed to update metadata status");
  return data;
};

export {
  getImages,
  getImage,
  createImage,
  updateImage,
  deleteImage,
  createMetadata,
  getMetadata,
  updateMetadataStatus,
};

export type Image = {
  id: string;
  name: string;
};

export type Images = Image[];
