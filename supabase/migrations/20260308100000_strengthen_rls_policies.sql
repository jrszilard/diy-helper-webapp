-- ============================================================================
-- Strengthen RLS policies for credit and bidding tables
-- ============================================================================

-- Remove dangerous policy that allows users to update their own credit balance.
-- All credit mutations should go through service_role (adminClient) only.
drop policy if exists "Users can update own credits" on user_credits;

-- Add service_role full access policy for qa_bids (needed for admin operations
-- like accepting/rejecting bids on behalf of the system).
create policy "Service role full access on qa_bids"
  on qa_bids for all
  using (auth.role() = 'service_role');
