-- ============================================================================
-- Phase 2 Migration: Chat History Tables + Inventory Case-Sensitivity Fix
-- ============================================================================

-- ── Chat History: conversations ──────────────────────────────────────────────

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  title       text not null default 'New Conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_conversations_user_id    on public.conversations(user_id);
create index if not exists idx_conversations_project_id on public.conversations(project_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- RLS for conversations
alter table public.conversations enable row level security;

create policy "Users can view own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- ── Chat History: conversation_messages ──────────────────────────────────────

create table if not exists public.conversation_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null,
  metadata          jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_conv_messages_conversation_id on public.conversation_messages(conversation_id);
create index if not exists idx_conv_messages_created_at      on public.conversation_messages(created_at);

-- RLS for conversation_messages (joins through conversations.user_id)
alter table public.conversation_messages enable row level security;

create policy "Users can view own conversation messages"
  on public.conversation_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can insert own conversation messages"
  on public.conversation_messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can delete own conversation messages"
  on public.conversation_messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- ── Inventory Case-Sensitivity Fix ──────────────────────────────────────────

-- Add generated column for case-insensitive lookups
alter table public.user_inventory
  add column if not exists item_name_lower text generated always as (lower(item_name)) stored;

-- Drop old unique constraint if it exists (may be named differently)
do $$
begin
  -- Try dropping by the most common constraint names
  begin
    alter table public.user_inventory drop constraint if exists user_inventory_user_id_item_name_key;
  exception when others then null;
  end;
  begin
    alter table public.user_inventory drop constraint if exists unique_user_inventory_item;
  exception when others then null;
  end;
end $$;

-- Also drop any unique index on (user_id, item_name)
drop index if exists user_inventory_user_id_item_name_key;
drop index if exists unique_user_inventory_item;

-- Create new case-insensitive unique index
create unique index if not exists idx_user_inventory_unique_lower
  on public.user_inventory(user_id, item_name_lower);
