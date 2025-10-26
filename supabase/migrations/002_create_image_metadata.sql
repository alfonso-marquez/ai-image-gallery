-- Create image_metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
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

-- Enable Row Level Security
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own metadata
CREATE POLICY "Users can only see own metadata" ON image_metadata
  FOR ALL 
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_metadata_image_id ON image_metadata(image_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_user_id ON image_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_image_metadata_status ON image_metadata(ai_processing_status);

-- Create index for tag searches (GIN index for array column)
CREATE INDEX IF NOT EXISTS idx_image_metadata_tags ON image_metadata USING GIN(tags);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_image_metadata_updated_at 
  BEFORE UPDATE ON image_metadata 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
