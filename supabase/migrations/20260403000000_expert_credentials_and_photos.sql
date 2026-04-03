-- ============================================================================
-- EXPERT CREDENTIALS & PHOTO STORAGE
-- ============================================================================

-- ── Credential fields on expert_profiles ────────────────────────────────────

ALTER TABLE expert_profiles
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS license_type TEXT,
  ADD COLUMN IF NOT EXISTS license_state TEXT,
  ADD COLUMN IF NOT EXISTS insurance_status TEXT;

-- Constraint: insurance_status must be one of known values or null
ALTER TABLE expert_profiles
  ADD CONSTRAINT chk_insurance_status
  CHECK (insurance_status IS NULL OR insurance_status IN ('insured', 'bonded_insured'));

-- ── Expert photos storage bucket ────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expert-photos',
  'expert-photos',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users upload to their own folder
CREATE POLICY "Experts upload own photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'expert-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read
CREATE POLICY "Public read expert photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'expert-photos');

-- Users delete own photos
CREATE POLICY "Experts delete own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'expert-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
