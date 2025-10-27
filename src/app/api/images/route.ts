import { getImages, createImage, updateImage, deleteImage } from "@/lib/images";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface ImageWithMetadata {
  id: number | string;
  filename?: string;
  name?: string;
  metadata?: {
    description?: string;
    tags?: string[];
    colors?: string[];
  };
}

interface ScoredImage {
  img: ImageWithMetadata;
  score: number;
}

const GET = async (request: NextRequest) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  try {
    const idParam = request.nextUrl.searchParams.get("id");
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";
    const color = request.nextUrl.searchParams.get("color")?.trim() || "";
    const similarTo =
      request.nextUrl.searchParams.get("similarTo")?.trim() || "";
    if (idParam) {
      // Fetch a single image with joined metadata
      const { data, error } = await supabase
        .from("images")
        .select(
          `
          *,
          metadata:image_metadata(*)
        `
        )
        .eq("user_id", user.id)
        .eq("id", Number(idParam))
        .single();
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      const transformed = { ...data, metadata: data.metadata?.[0] || null };
      return NextResponse.json([transformed], { status: 200 });
    }

    const images = await getImages(user.id);

    // 1) Text search by q
    if (q) {
      const lower = q.toLowerCase();
      const filtered = images.filter((img: ImageWithMetadata) => {
        const desc = (img.metadata?.description || "").toLowerCase();
        const fname = (
          (img.filename ?? img.name ?? "") as string
        ).toLowerCase();
        const tagMatch = Array.isArray(img.metadata?.tags)
          ? img.metadata.tags.some((t: string) =>
              t?.toLowerCase().includes(lower)
            )
          : false;
        const nameMatch = fname.includes(lower);
        return desc.includes(lower) || tagMatch || nameMatch;
      });
      return NextResponse.json(filtered, { status: 200 });
    }

    // 2) Filter by exact color hex (case-insensitive), allow with/without '#'
    if (color) {
      const norm = color.startsWith("#")
        ? color.toLowerCase()
        : `#${color.toLowerCase()}`;
      const colorFiltered = images.filter((img: ImageWithMetadata) => {
        const cols: string[] = img.metadata?.colors || [];
        return cols.some((c: string) => (c || "").toLowerCase() === norm);
      });
      return NextResponse.json(colorFiltered, { status: 200 });
    }

    // 3) Similar images by tags/colors/description for a given image id
    if (similarTo) {
      const targetId = Number(similarTo);
      const target = images.find(
        (img: ImageWithMetadata) => Number(img.id) === targetId
      );
      if (!target) {
        return NextResponse.json([], { status: 200 });
      }

      const targetTags = new Set<string>(
        (target.metadata?.tags as string[]) || []
      );
      const targetDesc = (target.metadata?.description || "").toLowerCase();
      const targetWords = new Set<string>(
        targetDesc.split(/\s+/).filter((w: string) => w.length > 3)
      );

      const jaccard = (a: Set<string>, b: Set<string>) => {
        if (a.size === 0 && b.size === 0) return 0;
        let inter = 0;
        for (const v of a) if (b.has(v)) inter++;
        const union = a.size + b.size - inter;
        return union === 0 ? 0 : inter / union;
      };

      const scored = images
        .filter((img: ImageWithMetadata) => Number(img.id) !== targetId)
        .map((img: ImageWithMetadata): ScoredImage => {
          const tags = new Set<string>((img.metadata?.tags as string[]) || []);
          const desc = (img.metadata?.description || "").toLowerCase();
          const words = new Set<string>(
            desc.split(/\s+/).filter((w: string) => w.length > 3)
          );

          const tagScore = jaccard(targetTags, tags);
          const descScore = jaccard(targetWords, words);

          // Weighted: 90% tags, 10% description - heavily favor Rekognition labels
          const score = 0.9 * tagScore + 0.1 * descScore;
          return { img, score };
        })
        .sort((a: ScoredImage, b: ScoredImage) => b.score - a.score)
        .filter((s: ScoredImage) => s.score > 0.1); // Require minimum 10% similarity

      return NextResponse.json(
        scored.map((s: ScoredImage) => s.img),
        { status: 200 }
      );
    }

    // Default: return all
    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

const POST = async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { filename, original_path, thumbnail_path } = body;

  if (!filename || !original_path) {
    return NextResponse.json(
      { error: "Missing required fields: filename and original_path" },
      { status: 400 }
    );
  }

  // Insert into images table
  try {
    const data = await createImage(
      filename,
      original_path,
      user.id,
      thumbnail_path
    );
    console.log("API Route:", data);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

// PATCH - update image (authenticated)
const PATCH = async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id, name, description } = await req.json();

  try {
    const data = await updateImage(id, name, description);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

// DELETE - delete image (authenticated)
const DELETE = async (req: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id)
    return NextResponse.json(
      { error: "Image id is required" },
      { status: 400 }
    );

  try {
    const data = await deleteImage(id);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

export { GET, POST, PATCH, DELETE };
