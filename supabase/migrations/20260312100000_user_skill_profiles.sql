CREATE TABLE user_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_familiarity JSONB NOT NULL DEFAULT '{
    "electrical": "novice", "plumbing": "novice", "carpentry": "novice",
    "hvac": "novice", "general": "novice", "landscaping": "novice",
    "painting": "novice", "roofing": "novice"
  }',
  communication_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (communication_level IN ('beginner', 'intermediate', 'advanced')),
  known_topics TEXT[] NOT NULL DEFAULT '{}',
  last_calibrated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_skill_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own skill profile"
  ON user_skill_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own skill profile"
  ON user_skill_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert skill profiles"
  ON user_skill_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE user_skill_profiles IS 'Cached skill profiles for adaptive AI response calibration';
