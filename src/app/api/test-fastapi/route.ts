import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl = process.env.HF_FASTAPI_URL;
  const tagsParam =
    request.nextUrl.searchParams.get("tags") || "Beach,Sunset,Ocean";
  const tags = tagsParam
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!baseUrl) {
    return NextResponse.json(
      { ok: false, error: "HF_FASTAPI_URL not set" },
      { status: 400 }
    );
  }
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.HF_FASTAPI_TIMEOUT_MS ?? 8000);
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/describe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const elapsed = Date.now() - started;
    const text = await res.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = undefined;
    try {
      json = JSON.parse(text);
    } catch {}
    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        elapsedMs: elapsed,
        response: json ?? text,
      },
      { status: res.ok ? 200 : 502 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    const elapsed = Date.now() - started;
    return NextResponse.json(
      {
        ok: false,
        error: e?.message || String(e),
        elapsedMs: elapsed,
      },
      { status: 500 }
    );
  }
}
