import { getImages, createImage, updateImage, deleteImage } from "@/lib/images";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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
    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
};

// POST - create a new image (authenticated)
// const POST = async (req: Request) => {
//   const supabase = await createClient();
//   const {
//     data: { user },
//     error: userError,
//   } = await supabase.auth.getUser();

//   if (userError || !user) {
//     return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
//   }

//   const formData = await req.formData();

//   const bucket = process.env.NEXT_PUBLIC_SUPABASE_BUCKET!;
//   const file = formData.get("file") as File;
//   const filename = formData.get("filename") as string; // 👈 user-provided name

//   if (!file || !filename || !user) {
//     return NextResponse.json(
//       { error: "Missing required fields" },
//       { status: 400 }
//     );
//   }

//   // Generate a unique file path for storage
//   const fileExt = file.name.split(".").pop();
//   const uniqueFileName = `${uuidv4()}.${fileExt}`;
//   const filePath = `${user.id}/originals/${uniqueFileName}`;

//   // 1️⃣ Upload file to Supabase Storage
//   const { error: uploadError } = await supabase.storage
//     .from(bucket)
//     .upload(filePath, file, { upsert: false });

//   if (uploadError) {
//     return NextResponse.json({ error: uploadError.message }, { status: 500 });
//   }

//   // 2️⃣ Get public URL
//   const { data: publicUrlData } = supabase.storage
//     .from(bucket)
//     .getPublicUrl(filePath);

//   // 3️⃣ Insert into images table
//   try {
//     const data = await createImage(filename, publicUrlData.publicUrl, user.id);
//     console.log("API Route:", data);
//     return NextResponse.json(data, { status: 200 });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 }
//     );
//   }

//   // return NextResponse.json({
//   //   success: true,
//   //   image,
//   //   publicUrl: publicUrlData.publicUrl, // optional convenience
//   // });
// };

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
