-- Create AI credentials table for storing admin-configured AI service credentials
CREATE TABLE ai_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'anthropic', 'openai', 'gemini', etc
  auth_type TEXT NOT NULL, -- 'api_key', 'user_id', 'email', 'token', 'custom'
  credential_encrypted TEXT NOT NULL, -- encrypted credential value
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE ai_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/edit their own credentials
CREATE POLICY ai_credentials_user_access ON ai_credentials
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX idx_ai_credentials_user_id ON ai_credentials(user_id);
CREATE INDEX idx_ai_credentials_provider ON ai_credentials(provider);

-- Drop old api_keys table if it exists
DROP TABLE IF EXISTS api_keys;
