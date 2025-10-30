import type { AIProvider, AIAnalysisResult, AIProviderConfig } from "./types";
import { RekognitionProvider } from "./providers/rekognition";
import { OpenAIVisionProvider } from "./providers/openai-vision";
import { BedrockProvider } from "./providers/bedrock";

const providers = new Map<string, AIProvider>([
  ["rekognition", RekognitionProvider],
  ["openai-vision", OpenAIVisionProvider],
  ["openai", OpenAIVisionProvider], // alias
  ["bedrock", BedrockProvider],
]);

function getProvider(name: string): AIProvider {
  const provider = providers.get(name.toLowerCase());
  if (!provider) {
    throw new Error(
      `Unknown AI provider: ${name}. Available: ${Array.from(providers.keys()).join(", ")}`
    );
  }
  return provider;
}

function getConfig(): AIProviderConfig {
  return {
    tagsProvider: process.env.AI_TAGS_PROVIDER || "rekognition",
    colorsProvider: process.env.AI_COLORS_PROVIDER || "rekognition",
    descriptionProvider: process.env.AI_DESCRIPTION_PROVIDER || "openai",
  };
}

export async function analyzeImage(
  imageBuffer: Buffer
): Promise<AIAnalysisResult> {
  const config = getConfig();

  try {
    const tagsProvider = getProvider(config.tagsProvider);
    const colorsProvider = getProvider(config.colorsProvider);
    const descriptionProvider = getProvider(config.descriptionProvider);

    // Run tags and colors in parallel
    const [tags, colors] = await Promise.all([
      tagsProvider.analyzeTags(imageBuffer),
      colorsProvider.analyzeColors(imageBuffer),
    ]);

    // Generate description using tags
    const description = await descriptionProvider.generateDescription(tags);

    return {
      tags: tags.slice(0, 10),
      colors: colors.slice(0, 3),
      description,
      provider: `${config.tagsProvider}+${config.colorsProvider}+${config.descriptionProvider}`,
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image");
  }
}

export async function analyzeImageWithUrl(
  imageUrl: string
): Promise<AIAnalysisResult> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return analyzeImage(buffer);
}

// Export for direct use if needed
export { RekognitionProvider, OpenAIVisionProvider, BedrockProvider };
export type { AIProvider, AIAnalysisResult, AIProviderConfig };
