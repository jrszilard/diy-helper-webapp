-- ============================================================================
-- Beta feedback collection table
-- ============================================================================

create table if not exists beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  page_url text,
  feedback_type text not null check (feedback_type in ('bug', 'suggestion', 'praise', 'other')),
  message text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index idx_beta_feedback_user_id on beta_feedback(user_id);
create index idx_beta_feedback_created_at on beta_feedback(created_at desc);

-- RLS
alter table beta_feedback enable row level security;

create policy "Users can insert own feedback"
  on beta_feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on beta_feedback for select
  using (auth.uid() = user_id);

create policy "Service role full access on beta_feedback"
  on beta_feedback for all
  using (auth.role() = 'service_role');
