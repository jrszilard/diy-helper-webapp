-- Per-expert preference: email me when a new question matches/targets me.
--
-- Experts already receive an in-app bell notification on new questions
-- (type qa_question_posted / qa_bidding_open). This flag additionally gates the
-- EMAIL for those notifications. Default true so existing experts — including the
-- concierge seed accounts — get emails immediately, with no opt-in step.

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS email_on_new_question boolean NOT NULL DEFAULT true;
