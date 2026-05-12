-- Test-account flag + production data hygiene
--
-- Surfaced by the 2026-05-11 post-redesign user-testing sweep: 5 of 5 expert personas
-- hit the same 43-day-old keyboard-mash test question, and 4 personas saw test
-- expert profiles ("Slizzy Industry", "Willy's Welding — Your Mom, CA") on the
-- public /experts directory. Trust-killer right before a credit-card prompt.
--
-- This migration:
--   1. Adds expert_profiles.is_test_account (boolean, default false)
--   2. Backfills it for any expert whose auth.users email matches the test domain
--   3. Deletes the orphan gibberish Q&A row(s) that 5+ sweeps flagged
--
-- Public API routes filter `is_test_account = false` so test profiles never
-- appear in /experts search or detail responses.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_expert_profiles_is_test_account
  ON expert_profiles (is_test_account)
  WHERE is_test_account = false;

-- Backfill: any expert_profile linked to a @diyhelper.test auth user is a test account.
UPDATE expert_profiles ep
SET is_test_account = true
FROM auth.users u
WHERE ep.user_id = u.id
  AND u.email LIKE '%@diyhelper.test';

-- Cleanup: the orphan keyboard-mash Q&A question(s) that have been live on production
-- since ~2026-03-29. Identified by the prefixes 5 expert personas independently reported.
DELETE FROM qa_questions
WHERE question_text ILIKE 'sfsgdfs%'
   OR question_text ILIKE 'dfg;kmsfg%'
   OR question_text ILIKE 'wfgseh%';
