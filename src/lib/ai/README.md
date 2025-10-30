# AI Provider System

Modular AI service architecture for image analysis with support for multiple providers.

## Quick Start

```typescript
import { analyzeImage } from "@/lib/ai-analysis";

const buffer = Buffer.from(imageData);
const result = await analyzeImage(buffer);

console.log(result.tags); // ["Pizza", "Food", "Cheese"]
console.log(result.colors); // ["#d2691e", "#f4a460", "#2f4f4f"]
console.log(result.description); // "A perfectly baked pizza..."
console.log(result.provider); // "rekognition+rekognition+openai"
```

## Architecture

```
src/lib/ai/
├── types.ts                    # Core interfaces
├── index.ts                    # Provider registry & main API
└── providers/
    ├── rekognition.ts         # AWS Rekognition (tags + colors)
    ├── openai-vision.ts       # OpenAI Vision (all features)
    └── bedrock.ts             # AWS Bedrock (descriptions only)
```

## Configuration

Use environment variables to select providers:

```env
# Provider Selection (mix and match!)
AI_TAGS_PROVIDER=openai-vision      # or "rekognition"
AI_COLORS_PROVIDER=rekognition      # or "openai-vision"
AI_DESCRIPTION_PROVIDER=openai      # or "bedrock"

# Rekognition Settings
AI_MAX_LABELS=10
AI_MIN_CONFIDENCE=80
AI_INCLUDE_PARENT_TAGS=true
AI_OCR_ENABLED=true
AI_OCR_MAX_WORDS=6
AI_EXCLUDE_PERSON_FROM_TAGS=false

# OpenAI Settings
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_VISION_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=120
OPENAI_TIMEOUT_MS=8000

# Bedrock Settings
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_MAX_TOKENS=60
BEDROCK_TIMEOUT_MS=7000

# AWS (for Rekognition/Bedrock)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Provider Capabilities

| Provider          | Tags          | Colors | Description |
| ----------------- | ------------- | ------ | ----------- |
| **Rekognition**   | ✅ (with OCR) | ✅     | ❌          |
| **OpenAI Vision** | ✅            | ✅     | ✅          |
| **Bedrock**       | ❌            | ❌     | ✅          |

## Usage Examples

### Default (Environment Config)

```typescript
import { analyzeImage } from "@/lib/ai-analysis";

const result = await analyzeImage(imageBuffer);
// Uses providers specified in env vars
```

### Direct Provider Access

```typescript
import { OpenAIVisionProvider } from "@/lib/ai/providers/openai-vision";

// Analyze tags only
const tags = await OpenAIVisionProvider.analyzeTags(buffer);

// Extract colors only
const colors = await OpenAIVisionProvider.analyzeColors(buffer);

// Generate description from tags
const desc = await OpenAIVisionProvider.generateDescription(tags);
```

### Mixed Providers

```env
# Use Rekognition for tags (fast, accurate)
AI_TAGS_PROVIDER=rekognition

# Use Rekognition for colors (precise color extraction)
AI_COLORS_PROVIDER=rekognition

# Use OpenAI for descriptions (natural language)
AI_DESCRIPTION_PROVIDER=openai
```

## Adding New Providers

Implement the `AIProvider` interface:

```typescript
import type { AIProvider } from "../types";

export const MyCustomProvider: AIProvider = {
  name: "my-provider",

  async analyzeTags(imageBuffer: Buffer): Promise<string[]> {
    // Your implementation
  },

  async analyzeColors(imageBuffer: Buffer): Promise<string[]> {
    // Your implementation
  },

  async generateDescription(tags: string[]): Promise<string> {
    // Your implementation
  },
};
```

Then register it in `src/lib/ai/index.ts`:

```typescript
const providers = new Map<string, AIProvider>([
  ["rekognition", RekognitionProvider],
  ["openai-vision", OpenAIVisionProvider],
  ["bedrock", BedrockProvider],
  ["my-provider", MyCustomProvider], // Add here
]);
```

## OpenAI Vision

Uses GPT-4o-mini for vision tasks:

**Tags**: Analyzes image and returns JSON array of labels
**Colors**: Identifies 3 dominant colors as hex codes  
**Description**: Generates factual 2-sentence description

```typescript
import { OpenAIVisionProvider } from "@/lib/ai/providers/openai-vision";

const tags = await OpenAIVisionProvider.analyzeTags(buffer);
// ["Pizza", "Food", "Cheese", "Pepperoni", "Italian Cuisine", ...]

const colors = await OpenAIVisionProvider.analyzeColors(buffer);
// ["#d2691e", "#f4a460", "#2f4f4f"]

const description = await OpenAIVisionProvider.generateDescription(tags);
// "A freshly baked pizza sits on a wooden table..."
```

## Cost Optimization

**Cheapest**: Rekognition tags + Rekognition colors + Bedrock description
**Best Quality**: OpenAI Vision for everything
**Balanced**: Rekognition (tags + colors) + OpenAI (description)

```env
# Cheap configuration
AI_TAGS_PROVIDER=rekognition
AI_COLORS_PROVIDER=rekognition
AI_DESCRIPTION_PROVIDER=bedrock

# Premium configuration
AI_TAGS_PROVIDER=openai-vision
AI_COLORS_PROVIDER=openai-vision
AI_DESCRIPTION_PROVIDER=openai

# Balanced configuration (recommended)
AI_TAGS_PROVIDER=rekognition
AI_COLORS_PROVIDER=rekognition
AI_DESCRIPTION_PROVIDER=openai
```

## Migration Guide

Old code:

```typescript
import { analyzeImage } from "@/lib/ai-analysis";
const result = await analyzeImage(buffer);
```

New code (same API):

```typescript
import { analyzeImage } from "@/lib/ai-analysis";
const result = await analyzeImage(buffer);
```

The old `ai-analysis.ts` now delegates to the new modular system automatically.

## Troubleshooting

**Error: Unknown AI provider**

- Check `AI_TAGS_PROVIDER`, `AI_COLORS_PROVIDER`, `AI_DESCRIPTION_PROVIDER`
- Valid values: `rekognition`, `openai-vision`, `openai`, `bedrock`

**Error: OPENAI_API_KEY not configured**

- Add `OPENAI_API_KEY=sk-...` to your environment variables

**Error: Bedrock doesn't support image tagging**

- Bedrock can only generate descriptions from tags
- Use Rekognition or OpenAI Vision for tags and colors

**Tags are empty**

- Lower `AI_MIN_CONFIDENCE` (default: 80)
- Increase `AI_MAX_LABELS` (default: 10)
- Enable OCR: `AI_OCR_ENABLED=true`
