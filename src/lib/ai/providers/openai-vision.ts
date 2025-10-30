import type { AIProvider } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let openaiClient: any | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getClient(): Promise<any> {
  if (!openaiClient && process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import("openai");
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (!openaiClient) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return openaiClient;
}

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

export const OpenAIVisionProvider: AIProvider = {
  name: "openai-vision",

  async analyzeTags(imageBuffer: Buffer): Promise<string[]> {
    const client = await getClient();
    const base64Image = imageBuffer.toString("base64");
    const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 8000);
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    const prompt = `Analyze this image and provide a JSON array of 10-15 relevant tags/labels that describe what's visible. Focus on: objects, actions, scene type, colors, and notable features. Return ONLY a valid JSON array of strings, no other text.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await withTimeout(
      client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
      timeout
    );

    const content = response.choices[0]?.message?.content?.trim() || "[]";
    try {
      const tags = JSON.parse(content);
      return Array.isArray(tags) ? tags.slice(0, 15) : [];
    } catch {
      // Fallback: extract words if JSON parsing fails
      const words = content.match(/["']([^"']+)["']/g) || [];
      return words.map((w: string) => w.replace(/["']/g, "")).slice(0, 15);
    }
  },

  async analyzeColors(imageBuffer: Buffer): Promise<string[]> {
    const client = await getClient();
    const base64Image = imageBuffer.toString("base64");
    const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 8000);
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    const prompt = `Identify the 3 most dominant colors in this image. Return ONLY a JSON array of exactly 3 hex color codes (e.g., ["#ff5733", "#33c1ff", "#2d5016"]), no other text.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await withTimeout(
      client.chat.completions.create({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
      timeout
    );

    const content = response.choices[0]?.message?.content?.trim() || "[]";
    try {
      const colors = JSON.parse(content);
      return Array.isArray(colors) ? colors.slice(0, 3) : [];
    } catch {
      // Fallback: extract hex codes
      const hexPattern = /#[0-9a-fA-F]{6}/g;
      const matches = content.match(hexPattern) || [];
      return matches.slice(0, 3);
    }
  },

  async generateDescription(tags: string[]): Promise<string> {
    if (tags.length === 0) return "An image.";

    const client = await getClient();
    const maxTokens = Number(process.env.OPENAI_MAX_TOKENS ?? 120);
    const timeout = Number(process.env.OPENAI_TIMEOUT_MS ?? 8000);
    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

    const prompt = `Write exactly two concise sentences describing a photo that includes: ${tags.join(
      ", "
    )}. Each sentence must be under 22 words, end with a period, and avoid semicolons. Only describe what is actually present based on these tags - do not add imagined objects, settings, or mood elements.`;

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

    return (
      completion.choices[0]?.message?.content?.trim() ||
      `A photo of ${tags.slice(0, 3).join(", ")}.`
    );
  },
};
