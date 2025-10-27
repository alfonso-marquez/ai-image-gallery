import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model_id } = body;

    const modelToTest =
      model_id ||
      process.env.BEDROCK_MODEL_ID ||
      "amazon.titan-text-express-v1";

    console.log("Testing Bedrock with model:", modelToTest);
    console.log("Region:", process.env.AWS_REGION);
    console.log(
      "Access Key ID:",
      process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + "..."
    );

    const region = process.env.AWS_REGION || "us-east-1";

    const bedrockClient = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    // Identity check omitted to avoid new dependency; ensure the Access Key ID prefix is logged instead
    const identity = {
      note: "caller identity not collected",
      accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.slice(0, 10),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requestBody: Record<string, any>;

    if (modelToTest.startsWith("anthropic.claude")) {
      requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "Say hello in one word." }],
          },
        ],
      };
    } else if (modelToTest.startsWith("amazon.titan")) {
      requestBody = {
        inputText: "Say hello in one word.",
        textGenerationConfig: {
          maxTokenCount: 50,
          temperature: 0.7,
          topP: 0.9,
        },
      };
    } else if (modelToTest.startsWith("amazon.nova")) {
      // Nova models use a different format
      requestBody = {
        messages: [
          {
            role: "user",
            content: [{ text: "Say hello in one word." }],
          },
        ],
        inferenceConfig: {
          max_new_tokens: 50,
          temperature: 0.7,
          top_p: 0.9,
        },
      };
    } else if (modelToTest.startsWith("meta.llama")) {
      requestBody = {
        prompt: "Say hello in one word.",
        max_gen_len: 50,
        temperature: 0.7,
        top_p: 0.9,
      };
    } else {
      // Generic fallback
      requestBody = {
        prompt: "Say hello in one word.",
        max_tokens: 50,
      };
    }

    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    const expectedResourceArn = `arn:aws:bedrock:${region}::foundation-model/${modelToTest}`;

    const command = new InvokeModelCommand({
      modelId: modelToTest,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    console.log("Success! Response:", responseBody);

    return NextResponse.json({
      success: true,
      model: modelToTest,
      region,
      expectedResourceArn,
      callerIdentity: identity,
      response: responseBody,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Bedrock test error:", error);
    return NextResponse.json(
      {
        success: false,
        region: process.env.AWS_REGION || "us-east-1",
        expectedResourceArn: null,
        error: error.name || "Unknown error",
        message: error.message || "No message",
        code: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}
