# Next Steps for AI Image Analysis

## ✅ Completed Setup

1. ✅ Created `image_metadata` table migration
2. ✅ Installed AWS SDK packages (@aws-sdk/client-rekognition, @aws-sdk/client-bedrock-runtime)
3. ✅ AWS credentials configured in .env.local
4. ✅ Created AI analysis utilities (src/lib/ai-analysis.ts)
5. ✅ Created metadata service functions (src/lib/images.ts)
6. ✅ Built /api/analyze-image endpoint
7. ✅ Updated ImageDropZone to trigger AI analysis

## 🚀 Required Actions

### 1. Run Database Migration

Execute in Supabase SQL Editor:

```bash
supabase/migrations/002_create_image_metadata.sql
```

### 2. Verify AWS Permissions

Ensure your AWS IAM user has:

- Rekognition: `DetectLabels` permission
- Bedrock: Access to `anthropic.claude-3-haiku-20240307-v1:0`

### 3. Enable Bedrock Model

1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude 3 Haiku
3. Wait for approval

### 4. Test the Flow

1. Start dev server: `npm run dev`
2. Upload an image
3. Check Supabase database:
   ```sql
   SELECT * FROM image_metadata ORDER BY created_at DESC LIMIT 5;
   ```
4. Verify status changes: `pending` → `processing` → `completed`

## 📁 Files Created/Modified

### New Files

- `supabase/migrations/002_create_image_metadata.sql`
- `src/lib/ai-analysis.ts`
- `docs/AI_SETUP.md`

### Modified Files

- `src/lib/images.ts` - Added metadata CRUD functions
- `src/app/api/analyze-image/route.ts` - Implemented AI endpoint
- `src/components/image/ImageDropZone.tsx` - Added AI trigger
- `package.json` - Added AWS SDK dependencies

## 🔍 How It Works

1. **Upload Phase**
   - User uploads image
   - Stored in Supabase Storage
   - Image record created in DB
   - User sees success message immediately

2. **AI Analysis (Background)**
   - Fetch image from Supabase Storage
   - Send to Rekognition for labels & colors
   - Use Bedrock Claude for description
   - Store results in `image_metadata` table

3. **Status Tracking**
   - `pending`: Initial state
   - `processing`: Analysis in progress
   - `completed`: Success
   - `failed`: Error occurred

## 💰 Cost Estimate

Per image analyzed:

- Rekognition DetectLabels: ~$0.001
- Bedrock Claude Haiku: ~$0.0001
- **Total: ~$0.0011 per image**

For 1000 images: ~$1.10

## 🐛 Troubleshooting

### AI Analysis Not Working

1. Check browser console for errors
2. Verify AWS credentials in .env.local
3. Check Supabase table:
   ```sql
   SELECT * FROM image_metadata
   WHERE ai_processing_status = 'failed';
   ```

### Bedrock Access Denied

- Enable model access in AWS Console
- Verify IAM permissions include `bedrock:InvokeModel`
- Check region is correct (ap-southeast-2)

### Image Not Found

- Verify image is publicly accessible from Supabase Storage
- Check bucket permissions allow public reads

## 📊 Monitoring

Query metadata status:

```sql
SELECT
  ai_processing_status,
  COUNT(*) as count
FROM image_metadata
GROUP BY ai_processing_status;
```

View recent analyses:

```sql
SELECT
  im.id,
  i.filename,
  im.description,
  im.tags,
  im.colors,
  im.ai_processing_status,
  im.created_at
FROM image_metadata im
JOIN images i ON i.id = im.image_id
ORDER BY im.created_at DESC
LIMIT 10;
```

## 🎯 Next Features to Build

1. Display tags and description in image modal
2. Search by tags functionality
3. Filter by color
4. "Find similar" based on tags
5. Retry failed analyses
6. Show processing status in UI
