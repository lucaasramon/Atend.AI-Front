-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN onboarding_data JSONB DEFAULT '{
  "company_info": {"completed": false},
  "whatsapp_setup": {"completed": false},
  "bot_intelligence": {"completed": false},
  "knowledge_base": {"completed": false},
  "integrations": {"completed": false}
}'::jsonb,
ADD COLUMN whatsapp_number TEXT,
ADD COLUMN system_prompt TEXT,
ADD COLUMN webhook_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_data IS 'Tracks completion status of onboarding steps';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed all onboarding steps';
COMMENT ON COLUMN public.profiles.whatsapp_number IS 'WhatsApp number connected to the bot';
COMMENT ON COLUMN public.profiles.system_prompt IS 'AI system prompt for bot personality';
COMMENT ON COLUMN public.profiles.webhook_url IS 'Webhook URL for n8n integration';