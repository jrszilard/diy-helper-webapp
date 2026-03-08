-- Phase 1: Threaded Q&A Conversations
-- Adds qa_messages table for back-and-forth conversation and new status values.

-- ── qa_messages table ──────────────────────────────────────────────────────

CREATE TABLE qa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES qa_questions(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES auth.users(id),
  sender_role text NOT NULL CHECK (sender_role IN ('diyer', 'expert')),
  content text NOT NULL,
  attachments text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_qa_messages_question ON qa_messages(question_id, created_at);
CREATE INDEX idx_qa_messages_sender ON qa_messages(sender_user_id);

-- ── RLS: only participants can see/create messages ────────────────────────

ALTER TABLE qa_messages ENABLE ROW LEVEL SECURITY;

-- Select: sender or any participant of the question
CREATE POLICY "Participants can view messages"
  ON qa_messages FOR SELECT USING (
    sender_user_id = auth.uid()
    OR question_id IN (
      SELECT id FROM qa_questions
      WHERE diyer_user_id = auth.uid()
    )
    OR question_id IN (
      SELECT q.id FROM qa_questions q
      JOIN expert_profiles ep ON q.expert_id = ep.id
      WHERE ep.user_id = auth.uid()
    )
  );

-- Insert: only participants
CREATE POLICY "Participants can send messages"
  ON qa_messages FOR INSERT WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      -- DIYer sending
      question_id IN (
        SELECT id FROM qa_questions WHERE diyer_user_id = auth.uid()
      )
      OR
      -- Expert sending (claimed expert only)
      question_id IN (
        SELECT q.id FROM qa_questions q
        JOIN expert_profiles ep ON q.expert_id = ep.id
        WHERE ep.user_id = auth.uid()
      )
    )
  );

-- ── Enable Supabase Realtime for qa_messages ──────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE qa_messages;

-- ── New columns on qa_questions for threaded mode ─────────────────────────

ALTER TABLE qa_questions
  ADD COLUMN IF NOT EXISTS is_threaded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolve_proposed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolve_proposed_by text CHECK (resolve_proposed_by IN ('expert', 'diyer'));

-- ── Function to auto-increment message_count ──────────────────────────────

CREATE OR REPLACE FUNCTION increment_qa_message_count()
RETURNS trigger AS $$
BEGIN
  UPDATE qa_questions
  SET message_count = message_count + 1,
      updated_at = now()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_qa_message_count
  AFTER INSERT ON qa_messages
  FOR EACH ROW EXECUTE FUNCTION increment_qa_message_count();
