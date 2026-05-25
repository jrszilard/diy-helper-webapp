-- ============================================================================
-- Reconcile beta_feedback with the structured beta survey (#46)
-- ============================================================================
-- The survey API (app/api/feedback/route.ts) writes user_type / usage_score /
-- price_option and omits feedback_type, but the original table (migration
-- 20260309000000_beta_feedback) predates the survey. Without these columns
-- every survey submission failed its insert (unknown columns + NOT NULL
-- violation on feedback_type), so no feedback was being captured.

alter table beta_feedback
  add column if not exists user_type    text,
  add column if not exists usage_score  smallint,
  add column if not exists price_option text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'beta_feedback_user_type_check') then
    alter table beta_feedback
      add constraint beta_feedback_user_type_check
      check (user_type is null or user_type in ('diyer', 'expert'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'beta_feedback_usage_score_check') then
    alter table beta_feedback
      add constraint beta_feedback_usage_score_check
      check (usage_score is null or usage_score between 1 and 5);
  end if;
end $$;

-- The structured survey has no feedback_type, and leaves message optional.
alter table beta_feedback alter column feedback_type drop not null;
alter table beta_feedback alter column message drop not null;
