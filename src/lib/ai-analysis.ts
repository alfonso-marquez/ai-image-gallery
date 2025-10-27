import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectTextCommand,
  type DetectLabelsCommandInput,
} from "@aws-sdk/client-rekognition";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
// Note: Avoid top-level import of the OpenAI SDK to prevent bundling issues in edge runtimes.
// We'll dynamically import it when needed in Node runtime only.

// Initialize AWS clients
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function normalizeTag(name: string): string {
  const s = name.trim();
  const lower = s.toLowerCase();
  const map: Record<string, string> = {
    dish: "Food",
    meal: "Food",
    cuisine: "Food",
    tableware: "Utensils",
    human: "Person",
  };
  return map[lower] || s;
}

function includeParentTags(): boolean {
  return (
    (process.env.AI_INCLUDE_PARENT_TAGS ?? "true").toLowerCase() === "true"
  );
}

function ocrEnabled(): boolean {
  return (process.env.AI_OCR_ENABLED ?? "true").toLowerCase() === "true";
}

async function detectTextWords(buffer: Buffer): Promise<string[]> {
  const minConf = Number(process.env.AI_MIN_CONFIDENCE ?? 80);
  const cmd = new DetectTextCommand({ Image: { Bytes: buffer } });
  const res = await rekognitionClient.send(cmd);
  const words: string[] = [];
  for (const det of res.TextDetections || []) {
    if (
      det.Type === "WORD" &&
      (det.Confidence || 0) >= minConf &&
      det.DetectedText
    ) {
      const w = det.DetectedText.trim();
      // simple heuristics to avoid junk
      if (/^[A-Za-z0-9][A-Za-z0-9\-\&\+\.]{1,30}$/.test(w)) {
        words.push(w);
      }
    }
  }
  // Dedupe and cap
  const unique = Array.from(new Set(words));
  const maxWords = Number(process.env.AI_OCR_MAX_WORDS ?? 6);
  return unique.slice(0, maxWords);
}

// Initialize OpenAI client (lazy, only if key is present)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let openaiClient: any | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOpenAIClient(): Promise<any> {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (!openaiClient) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return openaiClient;
}

export interface ImageAnalysisResult {
  tags: string[];
  description: string;
  colors: string[];
}

/**
 * Analyze image with Rekognition only (tags + colors)
 */
export async function analyzeImageWithRekognition(
  imageUrl: string
): Promise<{ tags: string[]; colors: string[] }> {
  const maxLabels = Number(process.env.AI_MAX_LABELS ?? 10);
  const minConfidence = Number(process.env.AI_MIN_CONFIDENCE ?? 80);

  // Fetch image (frontend already limits to 5MB)
  const imageBuffer = await fetchImageAsBuffer(imageUrl);

  // Rekognition: Detect labels with IMAGE_PROPERTIES for colors
  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MaxLabels: Math.max(maxLabels, 20),
    MinConfidence: minConfidence,
    Features: ["GENERAL_LABELS", "IMAGE_PROPERTIES"],
  });

  const response = await rekognitionClient.send(command);

  // Extract tags, enriching with parent categories and optional OCR
  const tagSet = new Set<string>();
  for (const label of response.Labels || []) {
    if ((label.Confidence || 0) < minConfidence) continue;
    if (label.Name) tagSet.add(normalizeTag(label.Name));
    if (includeParentTags() && label.Parents) {
      for (const p of label.Parents) {
        if (p?.Name) tagSet.add(normalizeTag(p.Name));
      }
    }
  }
  if (ocrEnabled()) {
    try {
      const words = await detectTextWords(imageBuffer);
      for (const w of words) tagSet.add(w);
    } catch (e) {
      // OCR is best-effort; ignore failures
      console.warn("OCR detectText failed:", e);
    }
  }
  const excludePerson =
    (process.env.AI_EXCLUDE_PERSON_FROM_TAGS ?? "false").toLowerCase() ===
    "true";
  const tags = Array.from(tagSet)
    .filter((t) => (excludePerson ? t.toLowerCase() !== "person" : true))
    .slice(0, maxLabels);

  // Extract dominant colors
  const dominantColors = (response.ImageProperties?.DominantColors || [])
    // Prefer the most visually prevalent colors first
    .slice()
    .sort((a, b) => (b.PixelPercent || 0) - (a.PixelPercent || 0));

  // Map to hex, drop duplicates, and take top 3
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const c of dominantColors) {
    const r = Math.round(c.Red || 0);
    const g = Math.round(c.Green || 0);
    const b = Math.round(c.Blue || 0);
    const hex = rgbToHex(r, g, b);
    if (!seen.has(hex)) {
      seen.add(hex);
      colors.push(hex);
    }
    if (colors.length >= 3) break;
  }

  return { tags, colors };
}

/**
 * Generate description with Bedrock
 */
export async function generateDescriptionWithBedrock(
  tags: string[]
): Promise<string> {
  if (tags.length === 0) {
    return "An image.";
  }

  const maxTokens = Number(process.env.BEDROCK_MAX_TOKENS ?? 60);
  const timeout = Number(process.env.BEDROCK_TIMEOUT_MS ?? 7000);
  const modelId =
    process.env.BEDROCK_MODEL_ID || "amazon.titan-text-express-v1";

  const prompt = `Write two factual sentences describing what is actually visible in a photo containing: ${tags.join(
    ", "
  )}. Only describe what is definitively present based on these tags. Do not add imagined elements, mood, or context that cannot be confirmed from the tags alone.`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let requestBody: Record<string, any>;

  if (modelId.startsWith("anthropic.claude")) {
    // Claude format (Messages API)
    requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    };
  } else if (modelId.startsWith("amazon.titan")) {
    // Titan format
    requestBody = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: maxTokens,
        temperature: 0.7,
        topP: 0.9,
      },
    };
  } else {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  });

  const response = await withTimeout(bedrockClient.send(command), timeout);

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  let description: string;
  if (modelId.startsWith("anthropic.claude")) {
    description = responseBody.content?.[0]?.text || "";
  } else if (modelId.startsWith("amazon.titan")) {
    description = responseBody.results?.[0]?.outputText || "";
  } else {
    description = "";
  }

  return description.trim() || `A photo of ${tags.slice(0, 3).join(", ")}.`;
}

/**
 * Generate description with OpenAI (GPT-3.5/4)
 */
export async function generateDescriptionWithOpenAI(
  tags: string[]
): Promise<string> {
  if (tags.length === 0) {
    return "An image.";
  }

  // Bump default tokens to reduce mid-sentence truncation; still configurable via env
  const maxTokens = Number(process.env.OPENAI_MAX_TOKENS ?? 120);
  const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 8000);
  const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  // Nudge the model toward two concise sentences to avoid run-ons and truncation
  const prompt = `Write exactly two concise sentences describing a photo that includes: ${tags.join(
    ", "
  )}. Each sentence must be under 22 words, end with a period, and avoid semicolons. Only describe what is actually present based on these tags - do not add imagined objects, settings, or mood elements.`;

  const client = await getOpenAIClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completion: any = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    timeout
  );

  let description = completion.choices[0]?.message?.content?.trim() || "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finishReason = (completion.choices[0] as any)?.finish_reason;

  // If truncated (finish_reason === 'length') or ends without terminal punctuation, make a short continuation request
  if (
    (finishReason === "length" || !/[\.!?]$/.test(description)) &&
    description
  ) {
    try {
      const continuationPrompt = `Continue and finish the description in exactly one short sentence (under 18 words). Do not repeat earlier text. Finish the thought naturally.`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cont: any = await withTimeout(
        client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content:
                "You complete partial outputs succinctly without repeating.",
            },
            { role: "user", content: continuationPrompt },
            { role: "assistant", content: description },
          ],
          max_tokens: Math.max(20, Math.min(60, Math.floor(maxTokens / 2))),
          temperature: 0.7,
        }),
        timeout
      );
      const tail = cont.choices[0]?.message?.content?.trim() || "";
      if (tail) {
        // Join with a space, then normalize any doubled punctuation
        description = `${description} ${tail}`.replace(/\s+/g, " ").trim();
      }
    } catch {}
  }

  return description || `A photo of ${tags.slice(0, 3).join(", ")}.`;
}

/**
 * Generate description using Hugging Face Inference API (fallback while Bedrock is unavailable)
 */
// Note: External fallbacks (e.g., Hugging Face) intentionally omitted per project requirements.

/**
 * Analyze image using Amazon Rekognition and Bedrock
 * @param imageBuffer - Image data as Buffer
 * @returns Analysis results with tags, description, and colors
 */
export async function analyzeImage(
  imageBuffer: Buffer
): Promise<ImageAnalysisResult> {
  try {
    // Frontend already limits to 5MB
    // Run Rekognition analysis in parallel
    const [labels, colors] = await Promise.all([
      detectLabels(imageBuffer),
      extractDominantColors(imageBuffer),
    ]);

    // Generate description using the detected labels
    const description = await generateDescription(labels);

    return {
      tags: labels.slice(0, 10), // Top 10 tags
      description,
      colors: colors.slice(0, 3), // Top 3 colors
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image");
  }
}

/**
 * Detect labels (tags) using Amazon Rekognition
 */
async function detectLabels(imageBuffer: Buffer): Promise<string[]> {
  // Frontend already limits to 5MB
  const params: DetectLabelsCommandInput = {
    Image: { Bytes: imageBuffer },
    MaxLabels: Number(process.env.AI_MAX_LABELS ?? 10),
    MinConfidence: Number(process.env.AI_MIN_CONFIDENCE ?? 80),
  };

  const command = new DetectLabelsCommand(params);
  const response = await rekognitionClient.send(command);

  const tagSet = new Set<string>();
  for (const label of response.Labels || []) {
    if (label.Name) tagSet.add(normalizeTag(label.Name));
    if (includeParentTags() && label.Parents) {
      for (const p of label.Parents) {
        if (p?.Name) tagSet.add(normalizeTag(p.Name));
      }
    }
  }
  const excludePerson =
    (process.env.AI_EXCLUDE_PERSON_FROM_TAGS ?? "false").toLowerCase() ===
    "true";
  return Array.from(tagSet).filter((t) =>
    excludePerson ? t.toLowerCase() !== "person" : true
  );
}

/**
 * Extract dominant colors using Amazon Rekognition
 */
async function extractDominantColors(imageBuffer: Buffer): Promise<string[]> {
  // Frontend already limits to 5MB
  const params: DetectLabelsCommandInput = {
    Image: { Bytes: imageBuffer },
    Features: ["IMAGE_PROPERTIES"],
  };

  const command = new DetectLabelsCommand(params);
  const response = await rekognitionClient.send(command);

  const dominant = (response.ImageProperties?.DominantColors || [])
    .slice()
    .sort((a, b) => (b.PixelPercent || 0) - (a.PixelPercent || 0));

  const seen = new Set<string>();
  const hexes: string[] = [];
  for (const c of dominant) {
    const r = Math.round(c.Red || 0);
    const g = Math.round(c.Green || 0);
    const b = Math.round(c.Blue || 0);
    const hex = rgbToHex(r, g, b);
    if (!seen.has(hex)) {
      seen.add(hex);
      hexes.push(hex);
    }
  }

  return hexes;
}

/**
 * Generate image description using AWS Bedrock (Claude)
 */
async function generateDescription(tags: string[]): Promise<string> {
  const bedrockEnabled =
    (process.env.BEDROCK_ENABLED ?? "true").toLowerCase() === "true";

  // If Bedrock is disabled or there are no tags, return a deterministic fallback
  if (!bedrockEnabled || tags.length === 0) {
    const top = tags.slice(0, 3);
    return top.length > 0 ? `A photo of ${top.join(", ")}.` : "A photo.";
  }

  const prompt = `Based on these image labels: ${tags.join(
    ", "
  )}, write a single factual sentence about what this image shows. Only describe what is confirmed by these labels. Do not add imagined objects or context.`;
  const modelId =
    process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any;

  // Different payload formats for different model families
  if (modelId.startsWith("anthropic.claude")) {
    // Anthropic Messages API format
    payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 60),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    };
  } else if (modelId.startsWith("amazon.titan-text")) {
    // Amazon Titan Text API format
    payload = {
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: Number(process.env.BEDROCK_MAX_TOKENS ?? 60),
        temperature: 0.7,
        topP: 0.9,
      },
    };
  } else {
    // Generic fallback
    payload = {
      prompt: prompt,
      max_tokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 60),
    };
  }

  const command = new InvokeModelCommand({
    modelId: modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(payload),
  });

  try {
    const response = await withTimeout(
      bedrockClient.send(command),
      Number(process.env.BEDROCK_TIMEOUT_MS ?? 7000)
    );
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Parse response based on model type
    let description: string;
    if (modelId.startsWith("anthropic.claude")) {
      description = responseBody.content[0].text.trim();
    } else if (modelId.startsWith("amazon.titan-text")) {
      description = responseBody.results[0].outputText.trim();
    } else {
      description =
        responseBody.text?.trim() || responseBody.completion?.trim() || "";
    }

    return description || `An image containing ${tags.slice(0, 3).join(", ")}.`;
  } catch (error) {
    console.error("Error generating description with Bedrock:", error);
    // Fallback to simple description
    return `An image containing ${tags.slice(0, 3).join(", ")}.`;
  }
}

/**
 * Convert RGB to hex color code
 */
function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

/**
 * Fetch image from URL and return as Buffer
 */
export async function fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Utility: add a timeout to any promise to avoid hanging calls/costs
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return promise;
  let timeoutHandle: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}
