import { NextResponse } from "next/server";

export async function GET() {
  // Avoid exposing diagnostics in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 404 }
    );
  }

  const openaiEnabled =
    (process.env.OPENAI_ENABLED ?? "true").toLowerCase() === "true";

  if (!openaiEnabled) {
    return NextResponse.json({ ok: true, openaiEnabled: false });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not set" },
        { status: 400 }
      );
    }

    // Lazy import to ensure Node runtime and avoid bundling if unused
    const { default: OpenAI } = await import("openai");

    const client = new OpenAI({ apiKey });

    const model = process.env.OPENAI_MODEL || "gpt-3.5-turbo";
    const completion = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: "Reply with the single word: OK" }],
      max_tokens: 2,
      temperature: 0,
    });

    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      ok: true,
      model,
      reply: text,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      finish_reason: (completion.choices?.[0] as any)?.finish_reason,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      usage: (completion as any)?.usage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
