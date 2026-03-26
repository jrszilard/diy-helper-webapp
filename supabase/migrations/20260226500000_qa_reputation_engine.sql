-- Phase 5: Reputation & Trust Engine
-- Adds reputation scoring to expert profiles and second-opinion support to Q&A.

-- ── Expert Reputation Fields ────────────────────────────────────────────────

alter table expert_profiles
  add column if not exists reputation_score numeric(5,2) default 0,
  add column if not exists expert_level text default 'bronze'
    check (expert_level in ('bronze', 'silver', 'gold', 'platinum')),
  add column if not exists acceptance_rate numeric(5,2) default 0,
  add column if not exists avg_response_minutes int,
  add column if not exists tier_upgrade_rate numeric(5,2) default 0,
  add column if not exists total_questions_answered int default 0,
  add column if not exists total_questions_claimed int default 0,
  add column if not exists total_corrections int default 0,
  add column if not exists total_graduations int default 0,
  add column if not exists reputation_updated_at timestamptz;

-- Index for queue priority sorting
create index if not exists idx_expert_profiles_reputation
  on expert_profiles(reputation_score desc, avg_rating desc)
  where is_active = true;

-- ── Second Opinion / Triangulation ──────────────────────────────────────────

alter table qa_questions
  add column if not exists parent_question_id uuid references qa_questions(id),
  add column if not exists is_second_opinion boolean default false;

create index if not exists idx_qa_questions_parent
  on qa_questions(parent_question_id)
  where parent_question_id is not null;

-- RLS: users can see second opinions linked to their own questions
create policy "DIYer sees second opinions on own questions"
  on qa_questions for select using (
    parent_question_id in (
      select id from qa_questions where diyer_user_id = auth.uid()
    )
  );
