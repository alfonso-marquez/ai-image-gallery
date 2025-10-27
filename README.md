<h1 align="center">AI Image Gallery</h1>

A Next.js + Supabase app where users upload images and automatically get AI-generated tags, descriptions, and dominant colors. Built with background processing, live UI updates, and cost-conscious AI providers.

## Stack

- Next.js App Router (TypeScript, React 19)
- Supabase (Auth, Storage, Postgres + RLS)
- AWS Rekognition (labels + image properties/colors)
- OpenAI (descriptions) with optional AWS Bedrock fallback
- shadcn/ui + Tailwind CSS

## Features

- Auth: email/password signup, login, logout, protected routes (gallery)
- Upload: drag & drop, JPEG/PNG, progress, thumbnail (300×300), public storage URLs
- AI analysis (async):
  - Tags (5–10) via Rekognition DetectLabels
  - Dominant colors (top 3) via Rekognition ImageProperties
  - Description (2 concise sentences) via OpenAI
  - Background job pattern with status: pending → processing → completed/failed
- UI: badges for AI status, preview dialog with live polling, description source label

Planned (not yet implemented):

- Search by text (tags/description)
- "Find similar" (nearest neighbors)

## Why this AI setup?

We split responsibilities by provider for best price/performance and simplicity:

- Rekognition for tags/colors
  - Purpose-built, low cost per image, no prompts/tokens.
  - Provides ImageProperties with DominantColors and PixelPercent.

- OpenAI for descriptions
  - Simple to integrate (single SDK), fast, reliable, good prose quality.
  - Very low tokens per request (short input; two short sentences output).

Alternatives considered

- AWS Bedrock (Titan / Claude)
  - Pros: AWS-native, competitive cost (Titan), strong models (Claude).
  - Cons: Access gating/new-account delays; more IAM/config overhead.
  - Decision: keep as optional provider and fallback path.

- Hugging Face Inference API via FastAPI
  - Pros: can be free for low volume; flexible model choice.
  - Cons: cold starts, quotas, extra backend to operate; more moving parts.
  - Decision: removed from default path to simplify ops and debugging.

Cost notes (order-of-magnitude)

- Rekognition DetectLabels (+ ImageProperties) ≈ fractions of a cent per image
- OpenAI small models (e.g., gpt‑4o‑mini / gpt‑3.5‑turbo) ≈ fractions of a cent per caption
- Net effect: sub-cent per image in most cases for tags+colors+caption

## How dominant colors are chosen

We call Rekognition DetectLabels with `IMAGE_PROPERTIES`, then:

- Prefer Foreground DominantColors when available; otherwise use whole-image DominantColors.
- Sort by `PixelPercent` (most prevalent first).
- Convert to hex, dedupe, take top 3.
- Optionally filter near-neutrals (configurable) if you want more “subject” color.

Note: whole-image analysis biases backgrounds (sky, walls). For stronger “subject focus,” we can crop to the largest detected object and re-run `IMAGE_PROPERTIES` (future enhancement).

## Architecture & flow

1. User uploads image → Supabase Storage stores `originals/` and generated `thumbnails/`
2. An `images` row is inserted (public URLs)
3. An `image_metadata` row is created with `ai_processing_status = processing`
4. Background analysis:
   - Rekognition → tags + colors
   - OpenAI → two-sentence description
5. Metadata updated → `completed` (or `failed`)
6. UI polls for status; preview dialog also polls when open

## Project structure (high-level)

```
src/
	app/
		(protected)/gallery/page.tsx        # Gallery page
		api/
			images/route.ts                   # List/create images (joins metadata)
			analyze-image/route.ts            # Orchestrates analysis
			test-rekognition/route.ts         # Rekognition diagnostics
			test-bedrock/route.ts             # Bedrock diagnostics (optional)
	components/
		image/                              # List, preview, drop zone, dialogs
	lib/
		ai-analysis.ts                      # Rekognition + OpenAI utilities
		images.ts                           # DB helpers (metadata CRUD)
```

## Environment

Create `.env.local` in the project root:

```ini
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPABASE_BUCKET=rekognition-bucket
# Optional (images config derives from URL if not set)
NEXT_PUBLIC_SUPABASE_HOST_NAME=your-project.supabase.co

# AWS for Rekognition (required for tags/colors)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AI_MAX_LABELS=10
AI_MIN_CONFIDENCE=80

# OpenAI for descriptions (recommended default)
OPENAI_API_KEY=sk-...
OPENAI_ENABLED=true
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=120
OPENAI_TIMEOUT_MS=8000

# Optional: Bedrock (enable later if desired)
BEDROCK_ENABLED=false
BEDROCK_MODEL_ID=amazon.titan-text-express-v1

# Cost guardrail
ANALYSIS_DAILY_CAP=200

# Optional (UI labeling only)
NEXT_PUBLIC_OPENAI_ENABLED=true
NEXT_PUBLIC_BEDROCK_ENABLED=false
```

## Running locally

1. Install deps

```bash
npm install
```

2. Start dev server

```bash
npm run dev
```

Open http://localhost:3000 and sign up / log in. Upload images in the Gallery.

## API routes

- `POST /api/images` → create image row (called by client after upload)
- `GET  /api/images` → list images for current user (joins `image_metadata`)
- `GET  /api/images?id=123` → fetch a single image (used by preview polling)
- `POST /api/analyze-image` → trigger analysis (called by client post-upload)
- `POST /api/test-rekognition` → diagnostics for Rekognition
- `POST /api/test-bedrock` → diagnostics for Bedrock (optional)

## Implementation notes

- Async & UI: Analysis runs in the background; the gallery and the preview dialog poll until metadata is `completed`. Loading badges and spinners indicate status.
- Description quality: Prompt is tuned for exactly two concise sentences to avoid run-ons; we also add a short continuation if the model truncates mid-thought.
- Safety & costs: A daily cap limits per-user analyses. Timeouts prevent long-running calls. Environment-driven providers let you disable Bedrock or OpenAI easily.

## Roadmap (Search features)

- Text search: simple `ILIKE` on `tags` and `description`, or Postgres full‑text index.
- Similar images: embeddings (CLIP-like) in a vector column, or color histograms as a lightweight proxy.

---

Made with ❤️ for the AI Image Gallery challenge. If you run into issues, open DevTools → Network and check responses from `/api/analyze-image` and `/api/images` while the preview dialog is open—those include helpful `provider` and `debug` hints in development.
