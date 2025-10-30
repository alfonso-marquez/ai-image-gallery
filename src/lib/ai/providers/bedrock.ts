import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import type { AIProvider } from "../types";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

export const BedrockProvider: AIProvider = {
  name: "bedrock",

  async analyzeTags(): Promise<string[]> {
    throw new Error(
      "Bedrock doesn't support image tagging - use Rekognition or OpenAI Vision"
    );
  },

  async analyzeColors(): Promise<string[]> {
    throw new Error(
      "Bedrock doesn't support color extraction - use Rekognition or OpenAI Vision"
    );
  },

  async generateDescription(tags: string[]): Promise<string> {
    if (tags.length === 0) return "An image.";

    const maxTokens = Number(process.env.BEDROCK_MAX_TOKENS ?? 60);
    const timeout = Number(process.env.BEDROCK_TIMEOUT_MS ?? 7000);
    const modelId =
      process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

    const prompt = `Based on these image labels: ${tags.join(
      ", "
    )}, write a single factual sentence about what this image shows. Only describe what is confirmed by these labels. Do not add imagined objects or context.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;

    if (modelId.startsWith("anthropic.claude")) {
      payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
        ],
      };
    } else if (modelId.startsWith("amazon.titan-text")) {
      payload = {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: maxTokens,
          temperature: 0.7,
          topP: 0.9,
        },
      };
    } else {
      payload = {
        prompt: prompt,
        max_tokens: maxTokens,
      };
    }

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    try {
      const response = await withTimeout(client.send(command), timeout);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      let description: string;
      if (modelId.startsWith("anthropic.claude")) {
        description = responseBody.content[0].text.trim();
      } else if (modelId.startsWith("amazon.titan-text")) {
        description = responseBody.results[0].outputText.trim();
      } else {
        description =
          responseBody.text?.trim() || responseBody.completion?.trim() || "";
      }

      return (
        description || `An image containing ${tags.slice(0, 3).join(", ")}.`
      );
    } catch (error) {
      console.error("Bedrock description error:", error);
      return `An image containing ${tags.slice(0, 3).join(", ")}.`;
    }
  },
};
