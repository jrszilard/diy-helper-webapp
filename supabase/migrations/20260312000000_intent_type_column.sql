-- Add intent_type to conversations for Smart Routing
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS intent_type TEXT;

-- Optional: add a check constraint for valid values
ALTER TABLE conversations
  ADD CONSTRAINT conversations_intent_type_check
  CHECK (intent_type IS NULL OR intent_type IN ('quick_question', 'troubleshooting', 'mid_project', 'full_project'));

COMMENT ON COLUMN conversations.intent_type IS 'Smart Routing intent classification: quick_question, troubleshooting, mid_project, full_project';
