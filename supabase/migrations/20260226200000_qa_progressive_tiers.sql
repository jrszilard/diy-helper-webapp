-- ============================================================================
-- Phase 3: Progressive Payment Tiers
-- Adds tier tracking, expert insight notes, and activates report corrections
-- ============================================================================

-- ── Tier tracking columns ──────────────────────────────────────────────────

alter table qa_questions add column current_tier int not null default 1;
alter table qa_questions add column tier_payments jsonb not null default '[]';
-- tier_payments format: [{"tier":1,"amount_cents":1500,"payment_intent_id":"pi_xxx","charged_at":"2026-..."},...]

-- ── Expert insight notes ───────────────────────────────────────────────────

alter table qa_questions add column expert_notes jsonb default null;
-- expert_notes format: {"tools_needed":["..."],"estimated_time":"...","common_mistakes":["..."],"local_code_notes":"...","additional":"..."}

-- ── Indexes ────────────────────────────────────────────────────────────────

-- Index for finding questions by tier (analytics / queue sorting)
create index idx_qa_questions_tier on qa_questions(current_tier) where current_tier > 1;

-- ── RLS for report_corrections (already has policies, add update for experts) ─

create policy "Experts update own corrections"
  on report_corrections for update using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
