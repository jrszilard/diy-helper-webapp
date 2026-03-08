-- ============================================================================
-- Agent Delegation System Tables
-- ============================================================================

-- Agent run: tracks a full pipeline execution
CREATE TABLE IF NOT EXISTS agent_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Input
  project_description  text NOT NULL,
  location_city        text,
  location_state       text,
  location_zip         text,
  budget_level         text CHECK (budget_level IN ('budget', 'mid-range', 'premium')),
  experience_level     text CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  timeframe            text,

  -- Status tracking
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'completed', 'error', 'cancelled')),
  current_phase text CHECK (current_phase IN ('research', 'design', 'sourcing', 'report')),
  error_message text,
  cancelled_at  timestamptz,

  -- Timing
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_runs_user_id ON agent_runs(user_id);
CREATE INDEX idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(user_id, status);

-- Agent phase: tracks each phase within a run
CREATE TABLE IF NOT EXISTS agent_phases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  phase       text NOT NULL CHECK (phase IN ('research', 'design', 'sourcing', 'report')),
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'running', 'completed', 'error', 'skipped')),

  -- Phase data (JSONB for flexibility as schemas evolve)
  input_data  jsonb,
  output_data jsonb,
  tool_calls  jsonb DEFAULT '[]'::jsonb,

  -- Error tracking
  error_message text,
  retry_count   integer DEFAULT 0,

  -- Timing
  started_at    timestamptz,
  completed_at  timestamptz,
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_phases_run_id ON agent_phases(run_id);
CREATE UNIQUE INDEX idx_agent_phases_run_phase ON agent_phases(run_id, phase);

-- Project report: the final deliverable
CREATE TABLE IF NOT EXISTS project_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,

  -- Report content
  title       text NOT NULL,
  sections    jsonb NOT NULL,
  summary     text,

  -- Metadata
  version       integer DEFAULT 1,
  total_cost    numeric,
  share_token   text UNIQUE,
  share_enabled boolean DEFAULT false,

  -- Timing
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_reports_user_id ON project_reports(user_id);
CREATE INDEX idx_project_reports_project_id ON project_reports(project_id);
CREATE INDEX idx_project_reports_run_id ON project_reports(run_id);
CREATE INDEX idx_project_reports_share_token ON project_reports(share_token)
  WHERE share_token IS NOT NULL;

-- ── RLS Policies ──────────────────────────────────────────────────────────────

ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;

-- Agent runs: users can only see/manage their own
CREATE POLICY "Users can manage their own agent runs"
  ON agent_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Agent phases: accessible through run ownership
CREATE POLICY "Users can view own agent phases"
  ON agent_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own agent phases"
  ON agent_phases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own agent phases"
  ON agent_phases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agent_runs r
      WHERE r.id = run_id AND r.user_id = auth.uid()
    )
  );

-- Project reports: users can see/manage their own
CREATE POLICY "Users can manage their own reports"
  ON project_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

CREATE TRIGGER agent_runs_updated_at
  BEFORE UPDATE ON agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER project_reports_updated_at
  BEFORE UPDATE ON project_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
