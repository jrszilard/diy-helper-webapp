-- ============================================================================
-- Filter test-DIYer questions out of the expert Q&A queue (B4)
-- ============================================================================
-- The 2026-05-11 and 2026-05-25 sweeps repeatedly hit keyboard-mash test
-- questions in the live expert queue. The prior fix (20260511_test_account_flag)
-- only deleted specific gibberish rows by text prefix — not durable: any new
-- question from a test DIYer reappears in real experts' queues.
--
-- Mirror expert_profiles.is_test_account: add the column, backfill from the
-- asker's auth email domain, and stamp future inserts at the data layer via a
-- trigger so no route can forget the filter. The expert queue then filters
-- is_test_account = false.

ALTER TABLE qa_questions
  ADD COLUMN IF NOT EXISTS is_test_account boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_qa_questions_is_test_account
  ON qa_questions (is_test_account)
  WHERE is_test_account = false;

-- Backfill existing rows from the asker's auth email domain.
UPDATE qa_questions q
SET is_test_account = true
FROM auth.users u
WHERE q.diyer_user_id = u.id
  AND u.email LIKE '%@diyhelper.test';

-- Stamp future inserts at the data layer. Returns `trigger`, so PostgREST does
-- not expose it as an RPC endpoint; SECURITY DEFINER + empty search_path is the
-- hardened pattern (also satisfies the function_search_path_mutable linter).
CREATE OR REPLACE FUNCTION set_qa_question_test_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  SELECT COALESCE(u.email LIKE '%@diyhelper.test', false)
    INTO NEW.is_test_account
  FROM auth.users u
  WHERE u.id = NEW.diyer_user_id;
  NEW.is_test_account := COALESCE(NEW.is_test_account, false);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qa_question_test_account ON qa_questions;
CREATE TRIGGER trg_qa_question_test_account
  BEFORE INSERT ON qa_questions
  FOR EACH ROW EXECUTE FUNCTION set_qa_question_test_account();
