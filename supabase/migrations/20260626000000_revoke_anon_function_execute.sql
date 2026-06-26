-- Security: close the function-EXECUTE and storage-listing residuals left after the
-- 2026-06-24 anon table-grant lockdown (20260624000000_revoke_anon_grants.sql).
--
-- Why the prior migration did not cover this: it ran
--   REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;
-- but Postgres grants function EXECUTE to the PUBLIC pseudo-role by default, and
-- `REVOKE ... FROM anon` only removes a grant made directly TO anon. anon (and
-- authenticated) inherit EXECUTE through PUBLIC, so `has_function_privilege('anon',
-- fn, 'EXECUTE')` stayed true. Supabase advisors confirmed this live:
--   * 0028 anon_security_definer_function_executable
--   * 0029 authenticated_security_definer_function_executable
--   * 0025 public_bucket_allows_listing
--   * 0011 function_search_path_mutable
-- The control that actually works is REVOKE ... FROM PUBLIC (done per-function below).
--
-- Each function was traced before revoking (none are called by the anon/authenticated
-- Supabase client — verified by grepping app/lib/components for `.rpc(`):
--   * increment_qa_message_count / set_qa_question_test_account / increment_qa_bid_count
--     / set_updated_at / update_updated_at / update_inventory_timestamp
--       -> trigger functions only. A trigger fires regardless of whether the DML role
--          holds EXECUTE on the function, so revoking EXECUTE does NOT break the trigger.
--   * user_owns_parent_question(uuid)
--       -> referenced in the qa_questions RLS policy "DIYer sees second opinions on own
--          questions". `authenticated` must keep EXECUTE (the policy evaluates it for
--          signed-in DIYers); anon does not need it (auth.uid() is null -> returns false).
--   * increment_user_credits / deduct_user_credits
--       -> called ONLY via the service-role admin client
--          (app/api/qa/[id]/not-helpful/route.ts, lib/marketplace/qa-helpers.ts). Money
--          path: today an authenticated caller is blocked by the absence of a user
--          INSERT/UPDATE policy on user_credits, but removing the RPC entrypoint is
--          defense-in-depth against a future policy change re-opening it.

-- ---------------------------------------------------------------------------
-- 1. Pin search_path on the flagged functions (advisor 0011). Recreated with
--    SET search_path = '' and fully schema-qualified bodies. now() and auth.uid()
--    resolve from pg_catalog / the auth schema and are already qualified.
--    CREATE OR REPLACE preserves each function's owner and existing ACL; the
--    REVOKE/GRANT block in section 2 then sets the final privileges.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_qa_message_count()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.qa_questions
  SET message_count = message_count + 1, updated_at = now()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_qa_bid_count()
  RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.qa_questions
  SET bid_count = bid_count + 1, updated_at = now()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_timestamp()
  RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_user_credits(p_user_id uuid, p_amount_cents integer)
  RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  new_balance int;
BEGIN
  INSERT INTO public.user_credits (user_id, balance_cents, updated_at)
  VALUES (p_user_id, p_amount_cents, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance_cents = public.user_credits.balance_cents + p_amount_cents,
    updated_at = now()
  RETURNING balance_cents INTO new_balance;
  RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_user_credits(p_user_id uuid, p_max_deduct_cents integer)
  RETURNS integer LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  current_balance int;
  actual_deduct int;
BEGIN
  SELECT balance_cents INTO current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;  -- row-level lock prevents concurrent deductions

  IF NOT FOUND OR current_balance <= 0 THEN
    RETURN 0;
  END IF;

  actual_deduct := least(current_balance, p_max_deduct_cents);

  UPDATE public.user_credits
  SET balance_cents = balance_cents - actual_deduct,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN actual_deduct;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_parent_question(parent_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.qa_questions
    WHERE id = parent_id AND diyer_user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Revoke the PUBLIC-inherited EXECUTE that made these callable by the anon
--    key via /rest/v1/rpc (advisors 0028 / 0029). Re-grant only where needed.
-- ---------------------------------------------------------------------------

-- Trigger-only functions: no role needs RPC EXECUTE; triggers fire regardless.
REVOKE EXECUTE ON FUNCTION public.increment_qa_message_count()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_qa_question_test_account()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_qa_bid_count()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at()               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_inventory_timestamp()    FROM PUBLIC, anon, authenticated;

-- RLS-policy helper: authenticated keeps EXECUTE (policy evaluates it), anon loses it.
REVOKE EXECUTE ON FUNCTION public.user_owns_parent_question(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.user_owns_parent_question(uuid) TO authenticated, service_role;

-- Credit-mutation helpers: service-role (admin client) only.
REVOKE EXECUTE ON FUNCTION public.increment_user_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer)    FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.increment_user_credits(uuid, integer) TO service_role;
GRANT  EXECUTE ON FUNCTION public.deduct_user_credits(uuid, integer)    TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Storage: drop the broad public-listing SELECT policies (advisor 0025).
--    Both buckets are public, so object URLs (getPublicUrl) keep working without a
--    SELECT policy on storage.objects; this only removes the ability to ENUMERATE
--    files. The app never lists these buckets (uploads use the service-role admin
--    client, reads use public URLs), so no user-facing flow is affected.
--    NOTE: message-attachments remains a PUBLIC bucket — any DM attachment is still
--    readable by anyone who has the (unguessable UUID-pathed) URL. Converting it to a
--    private bucket + signed URLs is a follow-up tracked separately.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read access for message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public read expert photos" ON storage.objects;

-- Future-proofing note (intentionally NOT a blanket ALTER DEFAULT PRIVILEGES ...
-- REVOKE EXECUTE FROM PUBLIC, which would surprise future legitimately-public RPCs):
-- any NEW SECURITY DEFINER function added to schema public must explicitly
--   REVOKE EXECUTE ON FUNCTION public.<fn> FROM PUBLIC;
-- and grant only the roles that need it. Run `get_advisors(security)` after DDL.
