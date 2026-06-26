#!/usr/bin/env bash
#
# Function-EXECUTE lockdown test (migration 20260626000000).
#
# Boots a disposable Postgres that emulates Supabase's roles (anon / authenticated /
# service_role) and the default "EXECUTE granted to PUBLIC" on a faithful stub of the
# functions + triggers + storage policies the migration touches, applies the migration,
# and asserts:
#   * anon AND authenticated lose EXECUTE on the trigger / credit / test-account fns
#   * authenticated keeps EXECUTE on user_owns_parent_question (RLS policy needs it);
#     anon loses it
#   * service_role keeps EXECUTE on the credit helpers; anon/authenticated do not
#   * a trigger STILL FIRES after its function's EXECUTE is revoked (the safety claim)
#   * the two broad storage-listing policies are dropped
#   * search_path is pinned on the recreated functions
#
# Requires: docker. Run from anywhere: bash scripts/rls-function-execute.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260626000000_revoke_anon_function_execute.sql"
IMAGE="postgres:16-alpine"
CID=""
cleanup() { [ -n "$CID" ] && docker rm -f "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

[ -f "$MIGRATION" ] || { echo "✗ migration not found: $MIGRATION"; exit 1; }

echo "▸ starting disposable postgres ($IMAGE)…"
CID=$(docker run -d --rm -e POSTGRES_PASSWORD=postgres "$IMAGE")
until docker exec "$CID" pg_isready -U postgres -q 2>/dev/null; do sleep 0.5; done

psqlf() { docker exec -i "$CID" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q; }
q()     { docker exec -i "$CID" psql -U postgres -d postgres -tAc "$1"; }

echo "▸ seeding roles, schema, original functions, triggers, storage policies…"
psqlf <<'SQL'
-- Supabase-like roles (NOLOGIN, not superuser, no bypassrls — so privilege checks are real)
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

-- auth.uid() stub (user_owns_parent_question is LANGUAGE sql -> body validated at CREATE)
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

-- App stub tables (only the columns the functions touch)
CREATE TABLE public.qa_questions (
  id uuid PRIMARY KEY,
  diyer_user_id uuid,
  message_count int NOT NULL DEFAULT 0,
  bid_count int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.qa_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid);
CREATE TABLE public.qa_bids (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid);
CREATE TABLE public.user_credits (user_id uuid PRIMARY KEY, balance_cents int NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now());
CREATE TABLE public.user_inventory (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), updated_at timestamptz DEFAULT now());

-- Original functions (pre-migration: mutable search_path; EXECUTE defaults to PUBLIC)
CREATE FUNCTION public.increment_qa_message_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN UPDATE qa_questions SET message_count = message_count + 1, updated_at = now() WHERE id = NEW.question_id; RETURN NEW; END; $$;
CREATE FUNCTION public.set_qa_question_test_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN RETURN NEW; END; $$;
CREATE FUNCTION public.increment_qa_bid_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN UPDATE qa_questions SET bid_count = bid_count + 1, updated_at = now() WHERE id = NEW.question_id; RETURN NEW; END; $$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE FUNCTION public.update_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE FUNCTION public.update_inventory_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE FUNCTION public.increment_user_credits(p_user_id uuid, p_amount_cents integer) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE nb int; BEGIN
  INSERT INTO user_credits (user_id, balance_cents, updated_at) VALUES (p_user_id, p_amount_cents, now())
  ON CONFLICT (user_id) DO UPDATE SET balance_cents = user_credits.balance_cents + p_amount_cents, updated_at = now()
  RETURNING balance_cents INTO nb; RETURN nb; END; $$;
CREATE FUNCTION public.deduct_user_credits(p_user_id uuid, p_max_deduct_cents integer) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE cb int; ad int; BEGIN
  SELECT balance_cents INTO cb FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR cb <= 0 THEN RETURN 0; END IF;
  ad := least(cb, p_max_deduct_cents);
  UPDATE user_credits SET balance_cents = balance_cents - ad, updated_at = now() WHERE user_id = p_user_id;
  RETURN ad; END; $$;
CREATE FUNCTION public.user_owns_parent_question(parent_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM qa_questions WHERE id = parent_id AND diyer_user_id = auth.uid()) $$;

-- Trigger that we will prove still fires after EXECUTE is revoked
CREATE TRIGGER trg_increment_qa_message_count AFTER INSERT ON public.qa_messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_qa_message_count();

-- Storage stub with the two broad public-listing SELECT policies the migration drops
CREATE SCHEMA storage;
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access for message attachments" ON storage.objects FOR SELECT TO public USING (bucket_id = 'message-attachments');
CREATE POLICY "Public read expert photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'expert-photos');
SQL

echo "▸ baseline: every role can EXECUTE via PUBLIC (sanity)…"
[ "$(q "SELECT has_function_privilege('anon','public.increment_qa_message_count()','EXECUTE')")" = "t" ] \
  || { echo "✗ baseline wrong: anon should start with EXECUTE"; exit 1; }

echo "▸ applying migration $(basename "$MIGRATION")…"
docker exec -i "$CID" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q < "$MIGRATION"

fail=0
assert() { # $1=label $2=actual $3=expected
  if [ "$2" = "$3" ]; then echo "  ✓ $1"; else echo "  ✗ $1 (got '$2', want '$3')"; fail=1; fi
}

echo "▸ asserting post-migration EXECUTE privileges…"
assert "anon  cannot EXECUTE increment_qa_message_count" \
  "$(q "SELECT has_function_privilege('anon','public.increment_qa_message_count()','EXECUTE')")" "f"
assert "authenticated cannot EXECUTE increment_qa_message_count" \
  "$(q "SELECT has_function_privilege('authenticated','public.increment_qa_message_count()','EXECUTE')")" "f"
assert "anon  cannot EXECUTE set_qa_question_test_account" \
  "$(q "SELECT has_function_privilege('anon','public.set_qa_question_test_account()','EXECUTE')")" "f"
assert "anon  cannot EXECUTE user_owns_parent_question" \
  "$(q "SELECT has_function_privilege('anon','public.user_owns_parent_question(uuid)','EXECUTE')")" "f"
assert "authenticated CAN EXECUTE user_owns_parent_question (RLS policy needs it)" \
  "$(q "SELECT has_function_privilege('authenticated','public.user_owns_parent_question(uuid)','EXECUTE')")" "t"
assert "service_role CAN EXECUTE deduct_user_credits" \
  "$(q "SELECT has_function_privilege('service_role','public.deduct_user_credits(uuid,integer)','EXECUTE')")" "t"
assert "authenticated cannot EXECUTE deduct_user_credits" \
  "$(q "SELECT has_function_privilege('authenticated','public.deduct_user_credits(uuid,integer)','EXECUTE')")" "f"
assert "anon cannot EXECUTE increment_user_credits" \
  "$(q "SELECT has_function_privilege('anon','public.increment_user_credits(uuid,integer)','EXECUTE')")" "f"

echo "▸ asserting the trigger STILL FIRES after its function's EXECUTE was revoked…"
q "INSERT INTO public.qa_questions (id, diyer_user_id) VALUES ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')" >/dev/null
q "INSERT INTO public.qa_messages (question_id) VALUES ('11111111-1111-1111-1111-111111111111')" >/dev/null
assert "message_count incremented by trigger" \
  "$(q "SELECT message_count FROM public.qa_questions WHERE id='11111111-1111-1111-1111-111111111111'")" "1"

echo "▸ asserting storage listing policies were dropped…"
assert "0 broad public-listing policies remain" \
  "$(q "SELECT count(*) FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname IN ('Public read access for message attachments','Public read expert photos')")" "0"

echo "▸ asserting search_path is pinned on recreated functions…"
assert "increment_qa_message_count has search_path set" \
  "$(q "SELECT (proconfig::text LIKE '%search_path%') FROM pg_proc WHERE proname='increment_qa_message_count'")" "t"
assert "deduct_user_credits has search_path set" \
  "$(q "SELECT (proconfig::text LIKE '%search_path%') FROM pg_proc WHERE proname='deduct_user_credits'")" "t"
assert "user_owns_parent_question has search_path set" \
  "$(q "SELECT (proconfig::text LIKE '%search_path%') FROM pg_proc WHERE proname='user_owns_parent_question'")" "t"

echo
if [ "$fail" = "0" ]; then echo "✅ ALL ASSERTIONS PASSED"; else echo "❌ SOME ASSERTIONS FAILED"; exit 1; fi
