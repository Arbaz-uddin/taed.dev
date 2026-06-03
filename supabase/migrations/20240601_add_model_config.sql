-- Add model provider enum type
DO $$ BEGIN
    CREATE TYPE model_provider AS ENUM ('OPENAI', 'GEMINI', 'DEEPSEEK', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add model configuration columns to saved_apis table
ALTER TABLE saved_apis
ADD COLUMN IF NOT EXISTS selected_provider model_provider DEFAULT 'OPENAI',
ADD COLUMN IF NOT EXISTS selected_model TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS is_custom_model BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_endpoint_url TEXT,
ADD COLUMN IF NOT EXISTS custom_model_auth_key_env_var TEXT;

-- Add index for provider lookups
CREATE INDEX IF NOT EXISTS idx_saved_apis_provider ON saved_apis(selected_provider);

-- Update existing rows to have default values
UPDATE saved_apis 
SET selected_provider = 'OPENAI', 
    selected_model = 'gpt-4o-mini',
    is_custom_model = false
WHERE selected_provider IS NULL;

-- Create enterprise_vault_keys table for storing encrypted custom API key references
CREATE TABLE IF NOT EXISTS enterprise_vault_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    key_name TEXT NOT NULL,
    key_description TEXT,
    encrypted_key_reference TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key_name)
);

-- Add RLS policies for enterprise_vault_keys
ALTER TABLE enterprise_vault_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vault keys"
    ON enterprise_vault_keys FOR SELECT
    USING (auth.uid() = user_id OR team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert their own vault keys"
    ON enterprise_vault_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vault keys"
    ON enterprise_vault_keys FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vault keys"
    ON enterprise_vault_keys FOR DELETE
    USING (auth.uid() = user_id);

-- Add model info to api_usage_logs for tracking
ALTER TABLE api_usage_logs
ADD COLUMN IF NOT EXISTS model_provider model_provider,
ADD COLUMN IF NOT EXISTS model_name TEXT;
