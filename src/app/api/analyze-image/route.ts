import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  analyzeImageWithRekognition,
  generateDescriptionWithBedrock,
  generateDescriptionWithOpenAI,
} from "@/lib/ai-analysis";
import { createMetadata, updateMetadataStatus } from "@/lib/images";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { image_id, image_url } = body;

    if (!image_id || !image_url) {
      return NextResponse.json(
        { error: "image_id and image_url are required" },
        { status: 400 },
      );
    }

    // Dedupe: if metadata already exists and is completed, skip re-processing
    const { data: existingMeta, error: existingErr } = await supabase
      .from("image_metadata")
      .select("*")
      .eq("image_id", image_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      // non-fatal, continue
      console.warn("Warning checking existing metadata:", existingErr.message);
    } else if (existingMeta) {
      if (existingMeta.ai_processing_status === "completed") {
        return NextResponse.json({ success: true, metadata: existingMeta });
      }
      if (existingMeta.ai_processing_status === "processing") {
        return NextResponse.json(
          { success: true, metadata: existingMeta, status: "processing" },
          { status: 202 },
        );
      }
      // else 'failed' - we'll retry below and update the same row at the end
    }

    // Daily cap per user (cost guardrail)
    const DAILY_CAP = Number(process.env.ANALYSIS_DAILY_CAP ?? 200);
    if (DAILY_CAP > 0) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await supabase
        .from("image_metadata")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", since);
      if (!countErr && typeof count === "number" && count >= DAILY_CAP) {
        return NextResponse.json(
          { error: "Daily analysis limit reached. Please try again tomorrow." },
          { status: 429 },
        );
      }
    }

    // Create initial metadata record with 'processing' status
    await createMetadata(image_id, user.id, "", [], [], "processing");

    // Resolve provider flags once for visibility/debug
    const bedrockEnabled =
      (process.env.BEDROCK_ENABLED ?? "false").toLowerCase() === "true";
    const openaiEnabled =
      (process.env.OPENAI_ENABLED ?? "true").toLowerCase() === "true";

    let tags: string[] = [];
    let colors: string[] = [];
    let description = "";
    let provider: "bedrock" | "openai" | "fallback" = "fallback";

    try {
      // Always run Rekognition for tags and colors
      const rekognitionResult = await analyzeImageWithRekognition(image_url);
      tags = rekognitionResult.tags;
      colors = rekognitionResult.colors;

      // Provider priority: 1) Bedrock (if enabled) 2) OpenAI (if enabled) 3) Simple fallback
      if (bedrockEnabled) {
        try {
          description = await generateDescriptionWithBedrock(tags);
          provider = "bedrock";
        } catch (bedrockError) {
          console.warn("Bedrock failed; trying OpenAI:", bedrockError);
          if (openaiEnabled) {
            try {
              description = await generateDescriptionWithOpenAI(tags);
              provider = "openai";
            } catch (openaiError) {
              console.warn("OpenAI also failed:", openaiError);
              description =
                tags.length > 0
                  ? `A photo of ${tags.slice(0, 3).join(", ")}.`
                  : "An image.";
              provider = "fallback";
            }
          } else {
            description =
              tags.length > 0
                ? `A photo of ${tags.slice(0, 3).join(", ")}.`
                : "An image.";
            provider = "fallback";
          }
        }
      } else if (openaiEnabled) {
        try {
          description = await generateDescriptionWithOpenAI(tags);
          provider = "openai";
        } catch (openaiError) {
          console.warn("OpenAI failed:", openaiError);
          description =
            tags.length > 0
              ? `A photo of ${tags.slice(0, 3).join(", ")}.`
              : "An image.";
          provider = "fallback";
        }
      } else {
        description =
          tags.length > 0
            ? `A photo of ${tags.slice(0, 3).join(", ")}.`
            : "An image.";
        provider = "fallback";
      }
    } catch (rekognitionError) {
      console.error("Rekognition failed:", rekognitionError);
      await updateMetadataStatus(image_id, "failed");
      return NextResponse.json(
        {
          error: "AI analysis failed",
          details:
            rekognitionError instanceof Error
              ? rekognitionError.message
              : "Unknown error",
        },
        { status: 500 },
      );
    }

    // Update metadata with analysis results
    const supabaseClient = await createClient();
    const { data, error } = await supabaseClient
      .from("image_metadata")
      .update({
        description: description,
        tags: tags,
        colors: colors,
        ai_processing_status: "completed",
      })
      .eq("image_id", image_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating metadata:", error);
      await updateMetadataStatus(image_id, "failed");
      return NextResponse.json(
        { error: "Failed to save analysis results" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      metadata: data,
      provider,
      debug:
        process.env.NODE_ENV !== "production"
          ? { bedrockEnabled, openaiEnabled }
          : undefined,
    });
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
