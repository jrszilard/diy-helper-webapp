-- Security: lock anonymous (logged-out) access out of the application schema.
--
-- Root cause (pre-public security audit, 2026-06-24): every table has RLS enabled,
-- but Supabase grants the `anon` role table privileges by default and ~90% of our
-- policies omit a `TO authenticated` clause. Any policy branch that is true without
-- auth.uid() (e.g. `status = 'open'`, `is_active = true`) therefore returns rows to
-- UNAUTHENTICATED requests made with the public anon key (which ships in the JS
-- bundle). This exposed, with no login:
--   * qa_questions   -> DIYer PII + Stripe customer / payment-method / payment-intent IDs
--   * expert_profiles-> Stripe Connect IDs, exact GPS, lifetime earnings, license numbers
--   * project_rfps   -> homeowner location, budget, and site photos
--
-- All legitimate logged-out reads (public expert directory, open Q&A browsing) are
-- served through service-role API routes, NOT the anon client, so removing anon's
-- table privileges does not break any user-facing flow. Logged-in users hit the DB
-- as the `authenticated` role and are unaffected. The per-table RLS policies remain
-- as defense-in-depth; this migration removes the GRANT that made them reachable by
-- anonymous callers in the first place.

-- 1. Remove all default anon privileges on existing application objects.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2. Prevent future tables/migrations from silently re-granting to anon. Supabase's
--    default privileges are attached to the object-creating roles, so revoke the
--    default for each role that exists in this database.
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['postgres', 'supabase_admin']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON TABLES FROM anon', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon', r);
    END IF;
  END LOOP;
END $$;

-- NOTE (follow-up, not a launch blocker): an authenticated expert can still read a
-- DIYer's Stripe customer/payment-method IDs for OPEN questions via a direct REST
-- query, because the "Experts see claimable or assigned questions" policy returns the
-- full row. That is a separate Medium issue requiring an authenticated account. It is
-- NOT fixable with a column-level REVOKE here (the authenticated role legitimately
-- INSERTs those columns when a DIYer creates a question, and reads its own questions
-- with select('*')), so it must be addressed at the app/RLS layer — e.g. tightening
-- the open-question policy or moving payment identifiers to a service-role-only side
-- table. Tracked separately; this migration closes the Critical + High ANON exposure.
