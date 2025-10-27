import ImageClientWrapper from "@/components/image/ImageClientWrapper";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }

  let images;
  let errorMessage = null;

  const cookieStore = await cookies();
  // fetch initial images
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/images`, {
      headers: { cookie: cookieStore.toString() },
    });

    if (!res.ok) throw new Error("Failed to fetch images");

    images = await res.json();
  } catch {
    errorMessage = "Image Fetch Failed. Please contact support.";
  }

  return (
    <div className="flex flex-col items-center p-8 pb-20 gap-16 sm:p-20 max-w-7xl mx-auto">
      <div className="mx-auto my-30 w-full max-w-6xl">
        <ImageClientWrapper
          initialImages={images || []}
          errorMessage={errorMessage || null}
        />
      </div>
    </div>
  );
}
