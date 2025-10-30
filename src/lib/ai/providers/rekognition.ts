import {
  RekognitionClient,
  DetectLabelsCommand,
  DetectTextCommand,
  type DetectLabelsCommandInput,
} from "@aws-sdk/client-rekognition";
import type { AIProvider } from "../types";

const client = new RekognitionClient({
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

async function detectTextWords(buffer: Buffer): Promise<string[]> {
  const minConf = Number(process.env.AI_MIN_CONFIDENCE ?? 80);
  const cmd = new DetectTextCommand({ Image: { Bytes: buffer } });
  const res = await client.send(cmd);
  const words: string[] = [];
  for (const det of res.TextDetections || []) {
    if (
      det.Type === "WORD" &&
      (det.Confidence || 0) >= minConf &&
      det.DetectedText
    ) {
      const w = det.DetectedText.trim();
      if (/^[A-Za-z0-9][A-Za-z0-9\-\&\+\.]{1,30}$/.test(w)) {
        words.push(w);
      }
    }
  }
  const unique = Array.from(new Set(words));
  const maxWords = Number(process.env.AI_OCR_MAX_WORDS ?? 6);
  return unique.slice(0, maxWords);
}

export const RekognitionProvider: AIProvider = {
  name: "rekognition",

  async analyzeTags(imageBuffer: Buffer): Promise<string[]> {
    const maxLabels = Number(process.env.AI_MAX_LABELS ?? 10);
    const minConfidence = Number(process.env.AI_MIN_CONFIDENCE ?? 80);
    const includeParents =
      (process.env.AI_INCLUDE_PARENT_TAGS ?? "true").toLowerCase() === "true";
    const ocrEnabled =
      (process.env.AI_OCR_ENABLED ?? "true").toLowerCase() === "true";
    const excludePerson =
      (process.env.AI_EXCLUDE_PERSON_FROM_TAGS ?? "false").toLowerCase() ===
      "true";

    const params: DetectLabelsCommandInput = {
      Image: { Bytes: imageBuffer },
      MaxLabels: Math.max(maxLabels, 20),
      MinConfidence: minConfidence,
    };

    const command = new DetectLabelsCommand(params);
    const response = await client.send(command);

    const tagSet = new Set<string>();
    for (const label of response.Labels || []) {
      if ((label.Confidence || 0) < minConfidence) continue;
      if (label.Name) tagSet.add(normalizeTag(label.Name));
      if (includeParents && label.Parents) {
        for (const p of label.Parents) {
          if (p?.Name) tagSet.add(normalizeTag(p.Name));
        }
      }
    }

    if (ocrEnabled) {
      try {
        const words = await detectTextWords(imageBuffer);
        for (const w of words) tagSet.add(w);
      } catch (e) {
        console.warn("OCR detectText failed:", e);
      }
    }

    return Array.from(tagSet)
      .filter((t) => (excludePerson ? t.toLowerCase() !== "person" : true))
      .slice(0, maxLabels);
  },

  async analyzeColors(imageBuffer: Buffer): Promise<string[]> {
    const params: DetectLabelsCommandInput = {
      Image: { Bytes: imageBuffer },
      Features: ["IMAGE_PROPERTIES"],
    };

    const command = new DetectLabelsCommand(params);
    const response = await client.send(command);

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

    return hexes.slice(0, 3);
  },

  async generateDescription(tags: string[]): Promise<string> {
    // Rekognition doesn't generate descriptions
    const top = tags.slice(0, 3);
    return top.length > 0 ? `A photo of ${top.join(", ")}.` : "A photo.";
  },
};
