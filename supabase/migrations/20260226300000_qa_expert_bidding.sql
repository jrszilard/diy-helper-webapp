-- ============================================================================
-- Phase 4: Expert Bidding & Proposals
-- Creates qa_bids table and adds bidding mode support to qa_questions
-- ============================================================================

-- ── New table: qa_bids ─────────────────────────────────────────────────────

create table qa_bids (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references qa_questions(id) on delete cascade,
  expert_id uuid not null references expert_profiles(id),
  proposed_price_cents int not null,
  platform_fee_cents int not null default 0,
  expert_payout_cents int not null default 0,
  pitch text not null,
  estimated_minutes int,
  relevant_experience text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint: one bid per expert per question
create unique index idx_qa_bids_question_expert on qa_bids(question_id, expert_id);

-- Index for listing bids by question
create index idx_qa_bids_question on qa_bids(question_id, created_at);

-- Index for expert's bid history
create index idx_qa_bids_expert on qa_bids(expert_id, status);

-- ── Bidding columns on qa_questions ────────────────────────────────────────

alter table qa_questions add column pricing_mode text not null default 'fixed'
  check (pricing_mode in ('fixed', 'bidding'));
alter table qa_questions add column bid_deadline timestamptz;
alter table qa_questions add column bid_count int not null default 0;
alter table qa_questions add column accepted_bid_id uuid references qa_bids(id);

-- Index for finding bidding questions
create index idx_qa_questions_bidding on qa_questions(pricing_mode, status, bid_deadline)
  where pricing_mode = 'bidding';

-- ── RLS for qa_bids ────────────────────────────────────────────────────────

alter table qa_bids enable row level security;

-- DIYer who owns the question can view all bids
create policy "Question owner views bids"
  on qa_bids for select using (
    question_id in (
      select id from qa_questions where diyer_user_id = auth.uid()
    )
  );

-- Experts can view their own bids
create policy "Experts view own bids"
  on qa_bids for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- Experts can create bids
create policy "Experts create bids"
  on qa_bids for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- Experts can update (withdraw) their own bids
create policy "Experts update own bids"
  on qa_bids for update using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Trigger to increment bid_count ─────────────────────────────────────────

create or replace function increment_qa_bid_count()
returns trigger as $$
begin
  update qa_questions
  set bid_count = bid_count + 1, updated_at = now()
  where id = NEW.question_id;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_increment_qa_bid_count
  after insert on qa_bids
  for each row execute function increment_qa_bid_count();

-- ── Updated_at trigger for qa_bids ─────────────────────────────────────────

create trigger set_updated_at_qa_bids
  before update on qa_bids
  for each row execute function update_updated_at();
