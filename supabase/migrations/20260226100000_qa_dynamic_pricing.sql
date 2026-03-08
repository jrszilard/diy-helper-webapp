-- Phase 2: Dynamic Pricing
-- Adds difficulty scoring and price tier columns to qa_questions.

ALTER TABLE qa_questions
  ADD COLUMN IF NOT EXISTS difficulty_score int,
  ADD COLUMN IF NOT EXISTS price_tier text CHECK (price_tier IN ('standard', 'complex', 'specialist'));
