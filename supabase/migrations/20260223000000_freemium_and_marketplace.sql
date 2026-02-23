-- ============================================================================
-- FREEMIUM + MARKETPLACE COMBINED MIGRATION
-- ============================================================================

-- ── Freemium Tracking ───────────────────────────────────────────────────────

create table user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null default 'free', -- 'free' | 'pro'
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'active', -- 'active', 'canceled', 'past_due', 'trialing'
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id)
);

create table usage_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_type text not null, -- 'report', 'chat_message', 'saved_project'
  period_start date not null, -- first day of month
  count int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id, usage_type, period_start)
);

-- ── Expert Profiles ─────────────────────────────────────────────────────────

create table expert_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  bio text,
  profile_photo_url text,

  -- Location
  city text not null,
  state text not null,
  zip_code text,
  service_radius_miles int default 50,
  latitude double precision,
  longitude double precision,

  -- Verification level
  verification_level int not null default 1,  -- 1=community, 2=verified, 3=licensed
  verification_status text not null default 'pending',  -- pending, under_review, verified, rejected

  -- Pricing
  hourly_rate_cents int,  -- for consultations, in cents
  qa_rate_cents int,      -- per question, in cents

  -- Performance
  avg_rating numeric(3,2) default 0,
  total_reviews int default 0,
  total_earnings_cents bigint default 0,
  response_time_hours numeric(4,1),  -- average response time

  -- Stripe
  stripe_connect_account_id text,
  stripe_onboarding_complete boolean default false,

  -- Status
  is_active boolean default true,
  is_available boolean default true,  -- manual toggle

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(user_id)
);

-- ── Expert Specialties ──────────────────────────────────────────────────────

create table expert_specialties (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  specialty text not null,
  years_experience int,
  is_primary boolean default false,

  unique(expert_id, specialty)
);

-- ── Expert Licenses ─────────────────────────────────────────────────────────

create table expert_licenses (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  license_type text not null,
  license_number text not null,
  issuing_state text not null,
  expiration_date date,
  verification_status text default 'pending',
  document_url text,
  verified_at timestamptz,

  created_at timestamptz default now()
);

-- ── Expert Insurance ────────────────────────────────────────────────────────

create table expert_insurance (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  insurance_type text not null,
  carrier text,
  policy_number text,
  expiration_date date,
  coverage_amount_cents bigint,
  document_url text,
  verification_status text default 'pending',

  created_at timestamptz default now()
);

-- ── Expert Availability ─────────────────────────────────────────────────────

create table expert_availability (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  day_of_week int not null,  -- 0=Sunday, 6=Saturday
  start_time time not null,
  end_time time not null,
  timezone text not null default 'America/New_York',
  is_recurring boolean default true,
  specific_date date,
  is_available boolean default true,

  created_at timestamptz default now()
);

-- ── Expert Portfolio ────────────────────────────────────────────────────────

create table expert_portfolio (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references expert_profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  project_type text,
  display_order int default 0,

  created_at timestamptz default now()
);

-- ── Q&A Questions ───────────────────────────────────────────────────────────

create table qa_questions (
  id uuid primary key default gen_random_uuid(),

  -- Parties
  diyer_user_id uuid not null references auth.users(id),
  expert_id uuid references expert_profiles(id),

  -- Context
  report_id uuid references project_reports(id),
  project_id uuid references projects(id),
  conversation_id uuid,

  -- Question content
  question_text text not null,
  category text not null,
  ai_context jsonb,

  -- Photos
  photo_urls text[] default '{}',

  -- Pricing
  price_cents int not null,
  platform_fee_cents int not null,
  expert_payout_cents int not null,

  -- Status
  status text not null default 'open',
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  answered_at timestamptz,

  -- Response
  answer_text text,
  answer_photos text[] default '{}',
  recommends_professional boolean default false,
  pro_recommendation_reason text,

  -- Payment
  payment_intent_id text,
  payout_status text default 'pending',
  payout_released_at timestamptz,

  -- Location context
  diyer_city text,
  diyer_state text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Consultations ───────────────────────────────────────────────────────────

create table consultations (
  id uuid primary key default gen_random_uuid(),

  diyer_user_id uuid not null references auth.users(id),
  expert_id uuid not null references expert_profiles(id),

  report_id uuid references project_reports(id),
  project_id uuid references projects(id),
  qa_question_id uuid references qa_questions(id),

  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  duration_minutes int not null,
  timezone text not null,

  video_room_id text,
  video_room_url text,
  recording_url text,

  diyer_notes text,
  diyer_photos text[] default '{}',

  expert_summary text,
  expert_notes jsonb,
  plan_modifications jsonb,
  recommends_professional boolean default false,
  pro_recommendation_scope text,

  price_cents int not null,
  platform_fee_cents int not null,
  expert_payout_cents int not null,

  status text not null default 'pending',
  cancelled_at timestamptz,
  cancellation_reason text,
  cancelled_by text,

  payment_intent_id text,
  payout_status text default 'pending',
  payout_released_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Project RFPs ────────────────────────────────────────────────────────────

create table project_rfps (
  id uuid primary key default gen_random_uuid(),

  diyer_user_id uuid not null references auth.users(id),

  report_id uuid not null references project_reports(id),
  project_id uuid references projects(id),

  title text not null,
  description text,
  selected_steps int[] default '{}',
  materials_handling text not null default 'discuss',

  timeline_preference text default 'flexible',
  budget_min_cents int,
  budget_max_cents int,

  city text not null,
  state text not null,
  zip_code text,

  site_photos text[] default '{}',

  status text not null default 'open',
  expires_at timestamptz not null,
  awarded_bid_id uuid,

  is_featured boolean default false,

  view_count int default 0,
  bid_count int default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Project Bids ────────────────────────────────────────────────────────────

create table project_bids (
  id uuid primary key default gen_random_uuid(),

  rfp_id uuid not null references project_rfps(id) on delete cascade,
  expert_id uuid not null references expert_profiles(id),

  total_price_cents int not null,
  per_phase_pricing jsonb,

  estimated_start_date date,
  estimated_duration_days int,

  scope_notes text,
  materials_approach text,
  plan_modifications text,
  permit_handling text,

  license_info jsonb,
  insurance_info jsonb,

  status text not null default 'submitted',

  message_to_diyer text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(rfp_id, expert_id)
);

-- ── Expert Reviews ──────────────────────────────────────────────────────────

create table expert_reviews (
  id uuid primary key default gen_random_uuid(),

  expert_id uuid not null references expert_profiles(id),
  reviewer_user_id uuid not null references auth.users(id),

  review_type text not null,
  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),

  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,

  expert_response text,
  expert_responded_at timestamptz,

  is_visible boolean default true,
  flagged boolean default false,

  created_at timestamptz default now()
);

-- ── Marketplace Messages ────────────────────────────────────────────────────

create table marketplace_messages (
  id uuid primary key default gen_random_uuid(),

  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),
  bid_id uuid references project_bids(id),

  sender_user_id uuid not null references auth.users(id),
  recipient_user_id uuid not null references auth.users(id),

  content text not null,
  attachments text[] default '{}',

  is_read boolean default false,
  read_at timestamptz,

  created_at timestamptz default now()
);

-- ── Payment Transactions ────────────────────────────────────────────────────

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),

  qa_question_id uuid references qa_questions(id),
  consultation_id uuid references consultations(id),
  rfp_id uuid references project_rfps(id),
  bid_id uuid references project_bids(id),

  payer_user_id uuid not null references auth.users(id),
  payee_user_id uuid references auth.users(id),

  amount_cents int not null,
  platform_fee_cents int not null default 0,
  net_amount_cents int not null,

  stripe_payment_intent_id text,
  stripe_transfer_id text,
  stripe_refund_id text,

  status text not null default 'pending',

  transaction_type text not null,

  created_at timestamptz default now()
);

-- ── Change Orders ───────────────────────────────────────────────────────────

create table change_orders (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid not null references project_bids(id),
  expert_id uuid not null references expert_profiles(id),

  description text not null,
  reason text not null,
  photo_urls text[] default '{}',

  additional_cost_cents int not null default 0,
  revised_timeline_days int,

  status text not null default 'proposed',
  approved_at timestamptz,
  rejected_reason text,

  created_at timestamptz default now()
);

-- ── Milestone Photos ────────────────────────────────────────────────────────

create table milestone_photos (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid references project_bids(id),
  expert_id uuid not null references expert_profiles(id),

  phase_label text not null,
  photo_url text not null,
  caption text,
  step_order int,

  created_at timestamptz default now()
);

-- ── Project Warranties ──────────────────────────────────────────────────────

create table project_warranties (
  id uuid primary key default gen_random_uuid(),
  rfp_id uuid not null references project_rfps(id),
  bid_id uuid not null references project_bids(id),
  expert_id uuid not null references expert_profiles(id),
  homeowner_user_id uuid not null references auth.users(id),

  warranty_type text not null default 'workmanship',
  duration_months int not null default 12,
  description text,
  starts_at timestamptz not null,
  expires_at timestamptz not null,

  claim_count int default 0,

  created_at timestamptz default now()
);

-- ── Report Corrections ──────────────────────────────────────────────────────

create table report_corrections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references project_reports(id),
  expert_id uuid not null references expert_profiles(id),

  section_type text not null,
  original_content text,
  corrected_content text not null,
  correction_reason text,

  source_type text not null,
  source_id uuid,

  validated boolean default false,
  validated_by uuid references expert_profiles(id),

  created_at timestamptz default now()
);

-- ── Notifications ───────────────────────────────────────────────────────────

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  metadata jsonb default '{}',
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index idx_user_subscriptions_user on user_subscriptions(user_id);
create index idx_usage_tracking_user_period on usage_tracking(user_id, usage_type, period_start);

create index idx_expert_profiles_location on expert_profiles(state, city);
create index idx_expert_profiles_verification on expert_profiles(verification_level, is_active);
create index idx_expert_profiles_user on expert_profiles(user_id);
create index idx_expert_specialties_specialty on expert_specialties(specialty);
create index idx_qa_questions_status on qa_questions(status, category);
create index idx_qa_questions_expert on qa_questions(expert_id, status);
create index idx_qa_questions_diyer on qa_questions(diyer_user_id);
create index idx_consultations_expert on consultations(expert_id, status);
create index idx_consultations_schedule on consultations(scheduled_start);
create index idx_project_rfps_status on project_rfps(status, state, city);
create index idx_project_rfps_expires on project_rfps(expires_at) where status = 'open';
create index idx_project_bids_rfp on project_bids(rfp_id, status);
create index idx_expert_reviews_expert on expert_reviews(expert_id, is_visible);
create index idx_marketplace_messages_qa on marketplace_messages(qa_question_id, created_at);
create index idx_marketplace_messages_consultation on marketplace_messages(consultation_id, created_at);
create index idx_marketplace_messages_rfp on marketplace_messages(rfp_id, created_at);
create index idx_marketplace_messages_sender on marketplace_messages(sender_user_id, created_at);
create index idx_marketplace_messages_recipient on marketplace_messages(recipient_user_id, created_at);
create index idx_payment_transactions_payer on payment_transactions(payer_user_id, created_at);
create index idx_change_orders_rfp on change_orders(rfp_id, status);
create index idx_milestone_photos_rfp on milestone_photos(rfp_id, phase_label);
create index idx_project_warranties_expert on project_warranties(expert_id);
create index idx_project_warranties_homeowner on project_warranties(homeowner_user_id);
create index idx_report_corrections_report on report_corrections(report_id);
create index idx_report_corrections_expert on report_corrections(expert_id);
create index idx_notifications_user on notifications(user_id, is_read, created_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table user_subscriptions enable row level security;
alter table usage_tracking enable row level security;
alter table expert_profiles enable row level security;
alter table expert_specialties enable row level security;
alter table expert_licenses enable row level security;
alter table expert_insurance enable row level security;
alter table expert_availability enable row level security;
alter table expert_portfolio enable row level security;
alter table qa_questions enable row level security;
alter table consultations enable row level security;
alter table project_rfps enable row level security;
alter table project_bids enable row level security;
alter table expert_reviews enable row level security;
alter table marketplace_messages enable row level security;
alter table payment_transactions enable row level security;
alter table change_orders enable row level security;
alter table milestone_photos enable row level security;
alter table project_warranties enable row level security;
alter table report_corrections enable row level security;
alter table notifications enable row level security;

-- ── User subscriptions: own only ────────────────────────────────────────────
create policy "Users see own subscription"
  on user_subscriptions for select using (auth.uid() = user_id);
create policy "Users can create own subscription"
  on user_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own subscription"
  on user_subscriptions for update using (auth.uid() = user_id);

-- ── Usage tracking: own only ────────────────────────────────────────────────
create policy "Users see own usage"
  on usage_tracking for select using (auth.uid() = user_id);

-- ── Expert profiles: public read, owner write ───────────────────────────────
create policy "Expert profiles are viewable by everyone"
  on expert_profiles for select using (is_active = true);
create policy "Experts can update own profile"
  on expert_profiles for update using (auth.uid() = user_id);
create policy "Users can create their expert profile"
  on expert_profiles for insert with check (auth.uid() = user_id);

-- ── Expert specialties: public read via expert profile, owner write ─────────
create policy "Expert specialties are viewable by everyone"
  on expert_specialties for select using (true);
create policy "Experts manage own specialties"
  on expert_specialties for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "Experts delete own specialties"
  on expert_specialties for delete using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Expert licenses: owner only ─────────────────────────────────────────────
create policy "Experts see own licenses"
  on expert_licenses for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "Experts manage own licenses"
  on expert_licenses for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Expert insurance: owner only ────────────────────────────────────────────
create policy "Experts see own insurance"
  on expert_insurance for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "Experts manage own insurance"
  on expert_insurance for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Expert availability: public read, owner write ───────────────────────────
create policy "Expert availability is viewable by everyone"
  on expert_availability for select using (true);
create policy "Experts manage own availability"
  on expert_availability for all using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Expert portfolio: public read, owner write ──────────────────────────────
create policy "Expert portfolio is viewable by everyone"
  on expert_portfolio for select using (true);
create policy "Experts manage own portfolio"
  on expert_portfolio for all using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Q&A: DIYer sees own, experts see open or claimed by them ────────────────
create policy "DIYers see own questions"
  on qa_questions for select using (auth.uid() = diyer_user_id);
create policy "Experts see claimable or assigned questions"
  on qa_questions for select using (
    status = 'open' or expert_id in (
      select id from expert_profiles where user_id = auth.uid()
    )
  );
create policy "DIYers create questions"
  on qa_questions for insert with check (auth.uid() = diyer_user_id);
create policy "Experts update claimed questions"
  on qa_questions for update using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "DIYers update own questions"
  on qa_questions for update using (auth.uid() = diyer_user_id);

-- ── Consultations: participants only ────────────────────────────────────────
create policy "DIYers see own consultations"
  on consultations for select using (auth.uid() = diyer_user_id);
create policy "Experts see own consultations"
  on consultations for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── RFPs: public read when open, owner full access ──────────────────────────
create policy "Open RFPs are viewable by authenticated users"
  on project_rfps for select using (
    status = 'open' or auth.uid() = diyer_user_id
  );
create policy "DIYers manage own RFPs"
  on project_rfps for all using (auth.uid() = diyer_user_id);

-- ── Bids: expert sees own, RFP owner sees all bids on their RFP ────────────
create policy "Experts see own bids"
  on project_bids for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );
create policy "RFP owners see bids on their RFPs"
  on project_bids for select using (
    rfp_id in (select id from project_rfps where diyer_user_id = auth.uid())
  );
create policy "Experts create bids"
  on project_bids for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Reviews: public read, reviewer/expert write ─────────────────────────────
create policy "Reviews are viewable by everyone"
  on expert_reviews for select using (is_visible = true);
create policy "Users create reviews"
  on expert_reviews for insert with check (auth.uid() = reviewer_user_id);
create policy "Experts respond to reviews"
  on expert_reviews for update using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Messages: participants only ─────────────────────────────────────────────
create policy "Users see own messages"
  on marketplace_messages for select using (
    auth.uid() = sender_user_id or auth.uid() = recipient_user_id
  );
create policy "Users can send messages"
  on marketplace_messages for insert with check (auth.uid() = sender_user_id);
create policy "Recipients can mark messages read"
  on marketplace_messages for update using (auth.uid() = recipient_user_id);

-- ── Payment transactions: payer/payee only ──────────────────────────────────
create policy "Users see own transactions"
  on payment_transactions for select using (
    auth.uid() = payer_user_id or auth.uid() = payee_user_id
  );

-- ── Change orders: RFP owner and expert ─────────────────────────────────────
create policy "RFP owners see change orders"
  on change_orders for select using (
    rfp_id in (select id from project_rfps where diyer_user_id = auth.uid())
  );
create policy "Experts see own change orders"
  on change_orders for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Milestone photos: RFP participants ──────────────────────────────────────
create policy "RFP owners see milestone photos"
  on milestone_photos for select using (
    rfp_id in (select id from project_rfps where diyer_user_id = auth.uid())
  );
create policy "Experts manage own milestone photos"
  on milestone_photos for all using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Warranties: homeowner and expert ────────────────────────────────────────
create policy "Homeowners see own warranties"
  on project_warranties for select using (auth.uid() = homeowner_user_id);
create policy "Experts see own warranties"
  on project_warranties for select using (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Report corrections: public read, expert write ───────────────────────────
create policy "Report corrections are viewable by everyone"
  on report_corrections for select using (true);
create policy "Experts create corrections"
  on report_corrections for insert with check (
    expert_id in (select id from expert_profiles where user_id = auth.uid())
  );

-- ── Notifications: own only ─────────────────────────────────────────────────
create policy "Users see own notifications"
  on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications"
  on notifications for update using (auth.uid() = user_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Reuse the existing update_updated_at() function from initial migration
create trigger set_updated_at_user_subscriptions
  before update on user_subscriptions
  for each row execute function update_updated_at();

create trigger set_updated_at_usage_tracking
  before update on usage_tracking
  for each row execute function update_updated_at();

create trigger set_updated_at_expert_profiles
  before update on expert_profiles
  for each row execute function update_updated_at();

create trigger set_updated_at_qa_questions
  before update on qa_questions
  for each row execute function update_updated_at();

create trigger set_updated_at_consultations
  before update on consultations
  for each row execute function update_updated_at();

create trigger set_updated_at_project_rfps
  before update on project_rfps
  for each row execute function update_updated_at();

create trigger set_updated_at_project_bids
  before update on project_bids
  for each row execute function update_updated_at();
