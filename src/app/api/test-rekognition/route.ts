import { NextRequest, NextResponse } from "next/server";
import { analyzeImageWithRekognition } from "@/lib/ai-analysis";

export async function POST(request: NextRequest) {
  try {
    const { image_url } = await request.json();

    if (!image_url) {
      return NextResponse.json(
        { error: "image_url required" },
        { status: 400 }
      );
    }

    console.log("Testing Rekognition with URL:", image_url);

    const result = await analyzeImageWithRekognition(image_url);

    console.log("Rekognition result:", result);

    return NextResponse.json({
      success: true,
      tags: result.tags,
      colors: result.colors,
    });
  } catch (error) {
    console.error("Test failed:", error);
    return NextResponse.json(
      {
        error: "Test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
