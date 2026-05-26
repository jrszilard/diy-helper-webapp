-- Concierge / seed expert flag
--
-- Concierge experts (revised design 2026-05-26) are real, human-operated expert
-- accounts that must be PUBLIC-VISIBLE (is_test_account = false) yet
-- DISTINGUISHABLE from real beta sign-ups. This flag enables badging, excluding
-- them from real-signup metrics, and clean retirement after beta.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS is_seed_expert boolean NOT NULL DEFAULT false;

-- Seeds are a tiny set; a partial index makes "find/clean up the seeds" cheap.
CREATE INDEX IF NOT EXISTS idx_expert_profiles_is_seed_expert
  ON expert_profiles (is_seed_expert)
  WHERE is_seed_expert = true;
