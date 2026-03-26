-- Fix infinite recursion in qa_questions RLS policy
-- The "DIYer sees second opinions on own questions" policy queries qa_questions
-- inside a policy on qa_questions, causing PostgreSQL error 42P17.
-- Fix: use a SECURITY DEFINER function to bypass RLS in the subquery.

-- Drop the recursive policy
DROP POLICY IF EXISTS "DIYer sees second opinions on own questions" ON qa_questions;

-- Create a security definer function that checks parent ownership without RLS
CREATE OR REPLACE FUNCTION user_owns_parent_question(parent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM qa_questions WHERE id = parent_id AND diyer_user_id = auth.uid()
  );
$$;

-- Recreate policy using the function (no recursion)
CREATE POLICY "DIYer sees second opinions on own questions"
  ON qa_questions FOR SELECT
  USING (
    is_second_opinion = true
    AND user_owns_parent_question(parent_question_id)
  );
