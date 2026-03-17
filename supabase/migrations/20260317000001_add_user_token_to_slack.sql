ALTER TABLE public.slack_integrations
  ADD COLUMN IF NOT EXISTS encrypted_user_token text,
  ADD COLUMN IF NOT EXISTS bot_user_id text;
