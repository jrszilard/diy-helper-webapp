-- Expert review tracking (prevents showing same item twice)
CREATE TABLE advisor_expert_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id       uuid NOT NULL REFERENCES expert_profiles(id) ON DELETE CASCADE,
  review_log_id   uuid NOT NULL REFERENCES advisor_review_log(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expert_id, review_log_id)
);

CREATE INDEX idx_advisor_expert_reviews_expert ON advisor_expert_reviews(expert_id);

ALTER TABLE advisor_expert_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Experts can insert their own reviews"
  ON advisor_expert_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Experts can read their own reviews"
  ON advisor_expert_reviews FOR SELECT
  TO authenticated
  USING (
    expert_id IN (SELECT id FROM expert_profiles WHERE user_id = auth.uid())
  );

-- Add category to review log for specialty-based filtering
ALTER TABLE advisor_review_log ADD COLUMN category text;

-- Service role can read all review data (needed for admin + API routes)
CREATE POLICY "Service role full access to expert reviews"
  ON advisor_expert_reviews FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can read review log"
  ON advisor_review_log FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can read correction queue"
  ON advisor_correction_queue FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update correction queue"
  ON advisor_correction_queue FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert rubric examples"
  ON advisor_rubric_examples FOR INSERT
  TO service_role
  WITH CHECK (true);
