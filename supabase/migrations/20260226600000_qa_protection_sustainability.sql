-- Phase 6: Protection & Sustainability
-- - qa_activity_log for fraud detection
-- - subscription_tier on expert_profiles
-- - consultation availability slots

-- ── Activity Log ────────────────────────────────────────────────────────────

create table if not exists qa_activity_log (
  id uuid primary key default gen_random_uuid(),

  event_type text not null, -- 'sanitization_trigger', 'rapid_messages', 'short_conversation', 'suspicious_pattern'
  severity text not null default 'low', -- 'low', 'medium', 'high'

  -- Actors
  user_id uuid references auth.users(id),
  expert_id uuid references expert_profiles(id),
  question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),

  -- Details
  description text not null,
  original_content text, -- the pre-sanitized content (for review)
  metadata jsonb default '{}', -- flexible data: matched patterns, frequency counts, etc.

  -- Review
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_action text, -- 'dismissed', 'warned', 'suspended', 'escalated'
  review_notes text,

  created_at timestamptz default now()
);

create index idx_activity_log_user on qa_activity_log(user_id, created_at);
create index idx_activity_log_type on qa_activity_log(event_type, severity, created_at);
create index idx_activity_log_unreviewed on qa_activity_log(reviewed_at) where reviewed_at is null;

alter table qa_activity_log enable row level security;

-- Only admins/service role can read activity logs (no user policy)
-- Access via adminClient only

-- ── Expert Subscription Tiers ───────────────────────────────────────────────

alter table expert_profiles
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'pro', 'premium')),
  add column if not exists subscription_stripe_id text,
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists subscription_started_at timestamptz;

create index idx_expert_profiles_subscription on expert_profiles(subscription_tier) where is_active = true;

-- ── Consultation Availability Slots ─────────────────────────────────────────

create table if not exists expert_consultation_slots (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,

  day_of_week int not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Sunday
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/New_York',

  slot_duration_minutes int not null default 30 check (slot_duration_minutes in (15, 30, 60)),
  is_active boolean default true,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(expert_id, day_of_week, start_time)
);

create index idx_consultation_slots_expert on expert_consultation_slots(expert_id, is_active);

alter table expert_consultation_slots enable row level security;

create policy "Experts manage own slots"
  on expert_consultation_slots for all using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

create policy "Public reads active slots"
  on expert_consultation_slots for select using (is_active = true);

create trigger set_updated_at_consultation_slots
  before update on expert_consultation_slots
  for each row execute function update_updated_at();
