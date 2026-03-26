-- ============================================================================
-- Strengthen RLS policies for credit and bidding tables
-- ============================================================================

-- Remove dangerous policy that allows users to update their own credit balance.
-- All credit mutations should go through service_role (adminClient) only.
drop policy if exists "Users can update own credits" on user_credits;

-- Add service_role full access policy for qa_bids (needed for admin operations
-- like accepting/rejecting bids on behalf of the system).
-- Wrapped in DO block so it's safe to run even if qa_bids hasn't been created yet.
do $$
begin
  if exists (select 1 from pg_tables where tablename = 'qa_bids') then
    execute $policy$
      drop policy if exists "Service role full access on qa_bids" on qa_bids
    $policy$;
    execute $policy$
      create policy "Service role full access on qa_bids"
        on qa_bids for all
        using (auth.role() = 'service_role')
    $policy$;
  end if;
end $$;
