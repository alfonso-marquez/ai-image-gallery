# AI Image Analysis Setup

## Overview

This application uses **Amazon Rekognition** and **AWS Bedrock (Claude)** for automated image analysis after upload.

## Features

- **Tag Generation**: 5-10 relevant tags per image using Rekognition label detection
- **Description**: AI-generated descriptive sentence using Bedrock Claude
- **Color Extraction**: Top 3 dominant colors using Rekognition image properties
- **Background Processing**: Analysis runs asynchronously without blocking uploads

## Architecture

### Flow

1. User uploads image(s) via drag-and-drop
2. Image stored in Supabase Storage (`user_id/originals/`)
3. Thumbnail generated and stored (`user_id/thumbnails/`)
4. Image record created in `images` table
5. **AI analysis triggered in background** (non-blocking)
6. Metadata record created with status `processing`
7. Image fetched from Supabase Storage
8. Rekognition analyzes image for labels and colors
9. Bedrock generates description based on labels
10. Metadata updated with results, status → `completed`

### Database Schema

```sql
CREATE TABLE image_metadata (
  id SERIAL PRIMARY KEY,
  image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  tags TEXT[],
  colors VARCHAR(7)[],
  ai_processing_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Status values:

- `pending`: Initial state
- `processing`: AI analysis in progress
- `completed`: Successfully analyzed
- `failed`: Analysis error occurred

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in Supabase SQL Editor:

```bash
supabase/migrations/002_create_image_metadata.sql
```

Or run directly:

```sql
-- Copy contents from migration file and execute
```

### 2. Environment Variables

Already configured in `.env.local`:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-southeast-2
```

### 3. AWS IAM Permissions

Ensure your AWS IAM user has these policies:

- **AmazonRekognitionFullAccess** (or custom policy):

  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["rekognition:DetectLabels"],
        "Resource": "*"
      }
    ]
  }
  ```

- **Bedrock Access** (for Claude):
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["bedrock:InvokeModel"],
        "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      }
    ]
  }
  ```

### 4. Enable Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Request access to **Claude 3 Haiku** model
3. Wait for approval (usually instant for Haiku)

## API Endpoints

### POST /api/analyze-image

Analyzes an uploaded image using AI.

**Request:**

```json
{
  "image_id": 123,
  "image_url": "https://...supabase.co/storage/v1/object/public/..."
}
```

**Response:**

```json
{
  "success": true,
  "metadata": {
    "id": 1,
    "image_id": 123,
    "description": "A scenic beach with sunset and people walking",
    "tags": ["beach", "sunset", "ocean", "people", "vacation", "sky", "water"],
    "colors": ["#FF6B35", "#004E89", "#F7B32B"],
    "ai_processing_status": "completed"
  }
}
```

## File Structure

```
src/
├── app/api/
│   └── analyze-image/
│       └── route.ts          # AI analysis endpoint
├── lib/
│   ├── ai-analysis.ts        # AWS Rekognition & Bedrock logic
│   └── images.ts             # Metadata CRUD functions
└── components/image/
    └── ImageDropZone.tsx     # Triggers analysis after upload
```

## Cost Considerations

### Amazon Rekognition

- **DetectLabels**: $0.001 per image (first 1M images/month)
- **Image Properties** (colors): Included with DetectLabels

### AWS Bedrock (Claude 3 Haiku)

- **Input**: $0.00025 per 1K tokens (~50 tokens per request)
- **Output**: $0.00125 per 1K tokens (~30 tokens per response)
- **Cost per image**: ~$0.0001

**Total per image**: ~$0.0011 (very affordable)

## Error Handling

- If AI analysis fails, upload still succeeds
- Metadata status set to `failed`
- Error logged to console, not shown to user
- Can manually retry analysis later

## Testing

1. Upload an image via the app
2. Check browser console for "AI analysis in progress..."
3. Query Supabase to verify metadata:
   ```sql
   SELECT * FROM image_metadata WHERE image_id = <your_image_id>;
   ```
4. Status should be `processing` → `completed` within 2-5 seconds

## Future Enhancements

- [ ] Retry failed analyses automatically
- [ ] Show processing status in UI
- [ ] Allow manual tag editing
- [ ] Batch analysis for multiple images
- [ ] Cache similar image analyses
