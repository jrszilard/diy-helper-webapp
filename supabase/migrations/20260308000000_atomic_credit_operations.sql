-- ============================================================================
-- Atomic credit operations to prevent race conditions
-- ============================================================================

-- Atomic credit increment: upserts user_credits row and returns new balance.
-- Used when crediting a user (e.g., not-helpful refund).
create or replace function increment_user_credits(
  p_user_id uuid,
  p_amount_cents int
) returns int as $$
declare
  new_balance int;
begin
  insert into user_credits (user_id, balance_cents, updated_at)
  values (p_user_id, p_amount_cents, now())
  on conflict (user_id)
  do update set
    balance_cents = user_credits.balance_cents + p_amount_cents,
    updated_at = now()
  returning balance_cents into new_balance;

  return new_balance;
end;
$$ language plpgsql;

-- Atomic credit deduction: deducts up to p_max_deduct_cents from a user's
-- balance using a row-level lock. Returns actual amount deducted (capped at
-- current balance). Used when applying credits toward a purchase.
create or replace function deduct_user_credits(
  p_user_id uuid,
  p_max_deduct_cents int
) returns int as $$
declare
  current_balance int;
  actual_deduct int;
begin
  select balance_cents into current_balance
  from user_credits
  where user_id = p_user_id
  for update;  -- row-level lock prevents concurrent deductions

  if not found or current_balance <= 0 then
    return 0;
  end if;

  actual_deduct := least(current_balance, p_max_deduct_cents);

  update user_credits
  set balance_cents = balance_cents - actual_deduct,
      updated_at = now()
  where user_id = p_user_id;

  return actual_deduct;
end;
$$ language plpgsql;
