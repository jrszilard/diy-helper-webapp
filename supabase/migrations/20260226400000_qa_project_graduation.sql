-- Phase 4D: Project Graduation — Link Q&A conversations to project RFPs
-- When a Q&A conversation reaches a point where hands-on work is needed,
-- the expert or DIYer can "graduate" it to a project RFP.

-- Add source Q&A question reference to project_rfps
alter table project_rfps
  add column if not exists source_qa_question_id uuid,
  add column if not exists priority_expert_id uuid;

DO $$ BEGIN
  ALTER TABLE project_rfps ADD CONSTRAINT project_rfps_source_qa_question_id_fkey
    FOREIGN KEY (source_qa_question_id) REFERENCES qa_questions(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE project_rfps ADD CONSTRAINT project_rfps_priority_expert_id_fkey
    FOREIGN KEY (priority_expert_id) REFERENCES expert_profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add graduated_to_rfp_id to qa_questions for reverse lookup
alter table qa_questions
  add column if not exists graduated_to_rfp_id uuid;

DO $$ BEGIN
  ALTER TABLE qa_questions ADD CONSTRAINT qa_questions_graduated_to_rfp_id_fkey
    FOREIGN KEY (graduated_to_rfp_id) REFERENCES project_rfps(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Index for lookups
create index if not exists idx_project_rfps_source_qa
  on project_rfps(source_qa_question_id)
  where source_qa_question_id is not null;
