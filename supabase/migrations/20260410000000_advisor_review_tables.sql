-- Advisor review loop tables
-- Supports: rubric examples (cold-start + live), review audit log, canary tests, correction queue
-- Research basis: Asawa et al. (2025) "How to Train Your Advisor" arXiv:2510.02453

CREATE TABLE advisor_rubric_examples (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  category            text NOT NULL,
  user_question       text NOT NULL,
  bad_response        text NOT NULL,
  good_response       text NOT NULL,
  rubric_items_failed integer[] NOT NULL,
  severity            text NOT NULL DEFAULT 'critical'
                        CHECK (severity IN ('critical', 'warning')),
  source              text NOT NULL
                        CHECK (source IN ('synthetic_seed', 'user_report', 'community_verified', 'expert_correction', 'canary_failure')),
  weight              real NOT NULL DEFAULT 0.3,
  explanation         text,
  is_active           boolean NOT NULL DEFAULT true,
  rubric_version      integer NOT NULL DEFAULT 1
);

CREATE INDEX idx_rubric_examples_weighted
  ON advisor_rubric_examples(category, weight DESC)
  WHERE is_active;

CREATE TABLE advisor_review_log (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  request_id            text NOT NULL,
  intent_type           text NOT NULL,
  advisor_mode          text NOT NULL CHECK (advisor_mode IN ('beta', 'custom')),
  reviewer_model        text NOT NULL,
  user_question         text NOT NULL,
  draft_response        text NOT NULL,
  verdict               text NOT NULL CHECK (verdict IN ('APPROVE', 'REVISE')),
  confidence            real,
  issues                jsonb NOT NULL DEFAULT '[]',
  revised_response      text,
  iterations_used       integer NOT NULL,
  safety_keywords       text[] NOT NULL DEFAULT '{}',
  rubric_version        integer NOT NULL,
  reviewer_tokens_in    integer NOT NULL,
  reviewer_tokens_out   integer NOT NULL,
  latency_ms            integer NOT NULL
);

CREATE INDEX idx_review_log_created ON advisor_review_log(created_at DESC);
CREATE INDEX idx_review_log_verdict ON advisor_review_log(verdict, created_at DESC);

CREATE TABLE advisor_canary_tests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  category            text NOT NULL,
  user_question       text NOT NULL,
  bad_response        text NOT NULL,
  expected_rubric_items integer[] NOT NULL,
  is_active           boolean NOT NULL DEFAULT true
);

CREATE TABLE advisor_canary_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at              timestamptz NOT NULL DEFAULT now(),
  canary_test_id      uuid NOT NULL REFERENCES advisor_canary_tests(id),
  reviewer_model      text NOT NULL,
  rubric_version      integer NOT NULL,
  caught              boolean NOT NULL,
  verdict             text NOT NULL,
  issues              jsonb NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_canary_results_run ON advisor_canary_results(run_at DESC);

CREATE TABLE advisor_correction_queue (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  source                text NOT NULL
                          CHECK (source IN ('user_flag', 'expert_correction', 'expert_review')),
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'promoted')),
  user_question         text NOT NULL,
  ai_response           text NOT NULL,
  flag_type             text,
  correction_text       text,
  corrected_response    text,
  conversation_id       text,
  message_id            text,
  reporter_id           uuid,
  reporter_role         text NOT NULL CHECK (reporter_role IN ('diy_user', 'expert')),
  expert_specialties    text[] DEFAULT '{}',
  category              text,
  rubric_items_failed   integer[],
  severity              text CHECK (severity IS NULL OR severity IN ('critical', 'warning')),
  promoted_at           timestamptz,
  promoted_to           uuid REFERENCES advisor_rubric_examples(id)
);

CREATE INDEX idx_correction_queue_status
  ON advisor_correction_queue(status, created_at DESC);
CREATE INDEX idx_correction_queue_pattern
  ON advisor_correction_queue(category, flag_type)
  WHERE status = 'pending';

ALTER TABLE advisor_rubric_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_review_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_canary_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_canary_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisor_correction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own corrections"
  ON advisor_correction_queue FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());
