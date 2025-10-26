export interface ImageMetadata {
  id: number;
  image_id: number;
  user_id: string;
  description: string | null;
  tags: string[];
  colors: string[];
  ai_processing_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface Image {
  id: string;
  filename: string;
  original_path: string;
  thumbnail_path: string;
  uploaded_at?: string;
  metadata?: ImageMetadata;
}
