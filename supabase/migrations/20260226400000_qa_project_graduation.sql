-- Phase 4D: Project Graduation — Link Q&A conversations to project RFPs
-- When a Q&A conversation reaches a point where hands-on work is needed,
-- the expert or DIYer can "graduate" it to a project RFP.

-- Add source Q&A question reference to project_rfps
alter table project_rfps
  add column if not exists source_qa_question_id uuid references qa_questions(id),
  add column if not exists priority_expert_id uuid references expert_profiles(id);

-- Add graduated_to_rfp_id to qa_questions for reverse lookup
alter table qa_questions
  add column if not exists graduated_to_rfp_id uuid references project_rfps(id);

-- Index for lookups
create index if not exists idx_project_rfps_source_qa
  on project_rfps(source_qa_question_id)
  where source_qa_question_id is not null;
