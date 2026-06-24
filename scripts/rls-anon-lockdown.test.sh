#!/usr/bin/env bash
#
# RLS anon-lockdown privilege test.
#
# Boots a disposable Postgres, emulates Supabase's default grants
# (anon / authenticated / service_role) on stub copies of every application table,
# applies the anon-lockdown migration, and asserts that anonymous (logged-out)
# requests have NO table access while authenticated and service_role keep theirs.
#
# This tests the *primary control* in the fix — table-level GRANTs. In Supabase a
# role with no privilege on a table gets `permission denied` from PostgREST
# regardless of any RLS policy, so revoking anon is what actually closes the breach.
#
# Requires: docker. Run from anywhere: bash scripts/rls-anon-lockdown.test.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION="$ROOT/supabase/migrations/20260624000000_revoke_anon_grants.sql"
IMAGE="postgres:16-alpine"
CID=""
cleanup() { [ -n "$CID" ] && docker rm -f "$CID" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "▸ starting disposable postgres ($IMAGE)…"
CID=$(docker run -d --rm -e POSTGRES_PASSWORD=postgres "$IMAGE")
until docker exec "$CID" pg_isready -U postgres -q 2>/dev/null; do sleep 0.5; done

psqlf() { docker exec -i "$CID" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q; }
q()     { docker exec -i "$CID" psql -U postgres -d postgres -tAc "$1"; }

echo "▸ provisioning Supabase-like roles + schema…"
printf '%s\n' \
  "create role anon nologin;" \
  "create role authenticated nologin;" \
  "create role service_role nologin;" | psqlf

# Stub every real application table. qa_questions carries the sensitive payment columns
# so the column-level REVOKE in the migration can be exercised.
TABLES=$(grep -rhoiE 'create table (if not exists )?(public\.)?[a-z_]+' "$ROOT"/supabase/migrations \
  | sed -E 's/.*create table (if not exists )?(public\.)?//I' \
  | tr '[:upper:]' '[:lower:]' | sort -u | grep -vx public)

{
  for t in $TABLES; do
    if [ "$t" = "qa_questions" ]; then
      echo "create table qa_questions (id uuid primary key default gen_random_uuid(), diyer_user_id uuid, stripe_customer_id text, payment_method_id text, payment_intent_id text, body text);"
    else
      echo "create table $t (id uuid primary key default gen_random_uuid());"
    fi
  done
  # Supabase default privileges: anon + authenticated + service_role all get table DML.
  echo "grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;"
} | psqlf

echo "▸ baseline anon table grants (vulnerable state): $(q "select count(*) from information_schema.role_table_grants where grantee='anon' and table_schema='public';")"

if [ -f "$MIGRATION" ]; then
  echo "▸ applying $(basename "$MIGRATION")…"
  cat "$MIGRATION" | psqlf
else
  echo "▸ no migration file present yet — expecting RED."
fi

echo "▸ assertions:"
fail=0
check() { if [ "$2" = "$3" ]; then echo "  ✓ $1 ($3)"; else echo "  ✗ $1 — expected '$2', got '$3'"; fail=1; fi; }

check "anon has ZERO table grants in public"          "0" "$(q "select count(*) from information_schema.role_table_grants where grantee='anon' and table_schema='public';")"
check "authenticated keeps qa_questions"              "t" "$(q "select has_table_privilege('authenticated','public.qa_questions','SELECT');")"
check "authenticated keeps expert_profiles"           "t" "$(q "select has_table_privilege('authenticated','public.expert_profiles','SELECT');")"
check "authenticated keeps project_rfps"              "t" "$(q "select has_table_privilege('authenticated','public.project_rfps','SELECT');")"
check "service_role keeps qa_questions"               "t" "$(q "select has_table_privilege('service_role','public.qa_questions','SELECT');")"
check "anon CANNOT read expert_profiles"              "f" "$(q "select has_table_privilege('anon','public.expert_profiles','SELECT');")"
check "anon CANNOT read project_rfps"                 "f" "$(q "select has_table_privilege('anon','public.project_rfps','SELECT');")"
check "anon CANNOT insert into qa_questions"          "f" "$(q "select has_table_privilege('anon','public.qa_questions','INSERT');")"

echo
if [ "$fail" = 0 ]; then
  echo "✅ PASS — anon locked out of the public schema; authenticated/service_role intact."
else
  echo "❌ FAIL — anon-lockdown invariants violated."
  exit 1
fi