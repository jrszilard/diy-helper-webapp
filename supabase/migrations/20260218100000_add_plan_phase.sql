-- Add 'plan' to allowed phase values for the new 2-phase pipeline.
-- Existing 'research', 'design', 'sourcing', 'report' remain for backward compat.

-- agent_phases.phase
ALTER TABLE agent_phases DROP CONSTRAINT IF EXISTS agent_phases_phase_check;
ALTER TABLE agent_phases ADD CONSTRAINT agent_phases_phase_check
  CHECK (phase IN ('research', 'design', 'sourcing', 'report', 'plan'));

-- agent_runs.current_phase
ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_current_phase_check;
ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_current_phase_check
  CHECK (current_phase IN ('research', 'design', 'sourcing', 'report', 'plan'));
