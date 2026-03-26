-- Q&A Payment Flow v2: charge on expert claim instead of at submission
-- New columns on qa_questions, new tables: user_credits, credit_transactions

-- ── New columns on qa_questions ─────────────────────────────────────────────

ALTER TABLE qa_questions
  ADD COLUMN IF NOT EXISTS payment_method_id text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS question_mode text NOT NULL DEFAULT 'pool',
  ADD COLUMN IF NOT EXISTS target_expert_id uuid REFERENCES expert_profiles(id),
  ADD COLUMN IF NOT EXISTS refund_id text,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS marked_not_helpful boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS not_helpful_at timestamptz,
  ADD COLUMN IF NOT EXISTS credit_applied_cents int DEFAULT 0;

ALTER TABLE qa_questions
  ADD CONSTRAINT qa_questions_question_mode_check
  CHECK (question_mode IN ('pool', 'direct'));

CREATE INDEX IF NOT EXISTS idx_qa_questions_mode ON qa_questions(question_mode);
CREATE INDEX IF NOT EXISTS idx_qa_questions_target_expert ON qa_questions(target_expert_id) WHERE target_expert_id IS NOT NULL;

-- ── user_credits table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  balance_cents int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own credits"
  ON user_credits FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can do everything (for API routes using admin client)
CREATE POLICY "Service role full access on user_credits"
  ON user_credits FOR ALL
  USING (auth.role() = 'service_role');

-- ── credit_transactions table (audit log) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount_cents int NOT NULL,
  reason text NOT NULL,
  qa_question_id uuid REFERENCES qa_questions(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on credit_transactions"
  ON credit_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_question ON credit_transactions(qa_question_id) WHERE qa_question_id IS NOT NULL;

-- ── RLS for direct questions: target experts can see questions addressed to them ──

CREATE POLICY "Target experts can view direct questions"
  ON qa_questions FOR SELECT
  USING (
    question_mode = 'direct'
    AND target_expert_id IN (
      SELECT id FROM expert_profiles WHERE user_id = auth.uid()
    )
  );
