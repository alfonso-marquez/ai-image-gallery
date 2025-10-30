# AI Service Comparison & Decision

## Executive Summary

**Final Architecture**: Modular system supporting AWS Rekognition, OpenAI Vision, and AWS Bedrock with environment-based provider selection.

**Default Configuration**: Rekognition (tags + colors) + OpenAI (descriptions) for best balance of cost and quality.

---

## Options Evaluated

### 1. AWS Rekognition ✅ SELECTED (Tags + Colors)

**Capabilities**:

- DetectLabels: Object/scene detection with confidence scores
- OCR: Text detection in images
- IMAGE_PROPERTIES: Dominant colors with pixel percentages
- Parent tag enrichment (e.g., "dish" → "Food")

**Pros**:

- Purpose-built for image analysis
- Extremely low cost: $0.001/image (first 1M/month)
- Fast response times (1-2 seconds)
- No token counting or prompt engineering needed
- Highly accurate object detection
- Includes color extraction at no extra cost

**Cons**:

- Cannot generate natural language descriptions
- Tags are generic keywords, not sentences
- Requires AWS account setup

**Cost per Image**: ~$0.001

**Use Case**: Tags and color extraction

---

### 2. OpenAI GPT-4o-mini Vision ✅ SELECTED (Descriptions)

**Capabilities**:

- Vision analysis with natural language output
- Tag extraction via JSON prompts
- Color identification
- Natural language descriptions

**Pros**:

- Single API for all features
- Excellent natural language generation
- Fast and reliable
- Simple integration (one SDK)
- Can follow specific prompt instructions (factual descriptions)

**Cons**:

- Higher cost than Rekognition for basic tagging
- Token-based pricing (variable costs)
- Requires careful prompt engineering to avoid hallucinations
- Vision model more expensive than text-only

**Cost per Image**:

- Vision analysis: ~$0.0002-0.0005 (gpt-4o-mini)
- Description generation: ~$0.0001 (gpt-3.5-turbo)
- Total: ~$0.0003-0.0006

**Use Case**: Natural language descriptions based on detected tags

---

### 3. AWS Bedrock (Claude/Titan) ✅ SUPPORTED (Optional)

**Capabilities**:

- Text generation only (no image analysis)
- Multiple model options (Claude 3 Haiku, Titan Text)
- Can generate descriptions from tag lists

**Pros**:

- AWS-native (unified billing with Rekognition)
- Claude 3 Haiku: fast, cheap, high quality
- Good for users already invested in AWS ecosystem
- No separate API key management

**Cons**:

- Model access requires approval (can take hours/days)
- Cannot analyze images directly (text-only)
- Higher latency than OpenAI
- More complex IAM configuration
- New accounts may face access restrictions

**Cost per Image**: ~$0.0001 (description only)

**Use Case**: Fallback/alternative description provider for AWS-committed users

---

### 4. Google Cloud Vision API ❌ NOT SELECTED

**Capabilities**:

- Label detection, OCR, face detection
- Safe search detection
- Landmark/logo recognition
- Similar to Rekognition feature set

**Pros**:

- Comprehensive image analysis
- Good accuracy
- Free tier: 1000 units/month

**Cons**:

- More expensive than Rekognition after free tier ($1.50 per 1000 images)
- Requires Google Cloud account setup
- Additional SDK dependencies
- No clear advantage over Rekognition for this use case

**Decision**: Rejected due to higher cost and no significant feature advantage

---

### 5. Hugging Face Inference API + FastAPI Backend ❌ NOT SELECTED

**Capabilities**:

- BLIP, CLIP, ViT models for image analysis
- Free tier available
- Self-hosted option

**Pros**:

- Can be free/very cheap for low volume
- Full model control and customization
- Open source models

**Cons**:

- Cold start issues (10-30 second delays)
- Requires separate FastAPI backend to manage
- Rate limits on free tier
- More moving parts to debug
- Quality varies significantly by model
- Requires model expertise to optimize

**Decision**: Rejected due to operational complexity and cold start latency

---

## Final Decision: Modular Architecture

### Why Modular?

Built a **provider system** that allows mixing and matching AI services:

```typescript
// Environment-based configuration
AI_TAGS_PROVIDER = rekognition;
AI_COLORS_PROVIDER = rekognition;
AI_DESCRIPTION_PROVIDER = openai;
```

**Benefits**:

1. **Best of each service**: Use each provider for its strength
2. **Cost optimization**: Switch providers based on volume/budget
3. **Easy A/B testing**: Compare provider quality without code changes
4. **Failover support**: Fallback to alternative providers on errors
5. **Future-proof**: Add Google Vision or custom models later

### Default Configuration

**Rekognition** for tags + colors (speed, cost, accuracy)  
**OpenAI** for descriptions (natural language quality)

### Alternative Configurations

**Cheapest** (for high volume):

```env
AI_TAGS_PROVIDER=rekognition
AI_COLORS_PROVIDER=rekognition
AI_DESCRIPTION_PROVIDER=bedrock
```

Cost: ~$0.0011/image

**Premium** (best quality):

```env
AI_TAGS_PROVIDER=openai-vision
AI_COLORS_PROVIDER=openai-vision
AI_DESCRIPTION_PROVIDER=openai
```

Cost: ~$0.0006/image (still very cheap!)

**Balanced** (recommended default):

```env
AI_TAGS_PROVIDER=rekognition
AI_COLORS_PROVIDER=rekognition
AI_DESCRIPTION_PROVIDER=openai
```

Cost: ~$0.0013/image

---

## Cost Comparison Summary

| Configuration          | Tags    | Colors   | Description | Total/Image |
| ---------------------- | ------- | -------- | ----------- | ----------- |
| Rekognition + OpenAI   | $0.001  | Included | $0.0003     | **$0.0013** |
| Rekognition + Bedrock  | $0.001  | Included | $0.0001     | **$0.0011** |
| OpenAI Vision Only     | $0.0003 | Included | $0.0003     | **$0.0006** |
| Google Vision + OpenAI | $0.0015 | Included | $0.0003     | **$0.0018** |

**Winner**: Rekognition + OpenAI for best cost/quality balance

---

## Trade-offs & Lessons Learned

### What Worked Well

- Modular architecture enables experimentation without code changes
- Rekognition's label quality is excellent (especially with parent tags + OCR)
- OpenAI descriptions are natural and follow factual prompts well
- Combined cost is negligible even at scale (<$1.50 per 1000 images)

### What Didn't Work

- Bedrock access delays (new accounts wait 24-48h for model approval)
- OpenAI Vision hallucinations required careful prompt engineering ("do not add imagined objects")
- Hugging Face cold starts made it unsuitable for production

### Architectural Decisions

1. **Interface-based design**: `AIProvider` interface enforces consistency
2. **Provider registry**: Runtime selection via Map lookup
3. **Environment configuration**: No code deployment needed to switch providers
4. **Backward compatibility**: Old code still works with new system
5. **Comprehensive docs**: `src/lib/ai/README.md` for developer reference

### Performance Characteristics

- Rekognition: 1-2 second response
- OpenAI descriptions: 2-3 seconds
- Bedrock: 3-5 seconds (higher latency)
- Total pipeline: 3-5 seconds end-to-end

### Scalability

- No rate limits hit in testing (up to 50 images/minute)
- Daily cap implemented (`ANALYSIS_DAILY_CAP=200`) as cost guardrail
- Can handle 10,000+ images/day within free/cheap tiers
- Parallel processing architecture ready for future optimization

---

## Conclusion

The modular AWS Rekognition + OpenAI architecture delivers:

- ✅ Sub-cent per image cost
- ✅ High quality tags, colors, and descriptions
- ✅ Fast processing (3-5 seconds)
- ✅ Flexibility to optimize per use case
- ✅ Simple to maintain and extend

This approach satisfies all project requirements while remaining cost-effective and production-ready.
