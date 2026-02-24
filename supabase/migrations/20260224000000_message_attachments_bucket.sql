-- ============================================================================
-- MESSAGE ATTACHMENTS STORAGE BUCKET
-- ============================================================================

-- Create public bucket for message attachment images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- ── Storage RLS Policies ────────────────────────────────────────────────────

-- Authenticated users can upload to their own folder: {userId}/...
create policy "Authenticated users upload to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read (public bucket)
create policy "Public read access for message attachments"
  on storage.objects for select
  to public
  using (bucket_id = 'message-attachments');

-- Users can delete their own uploads
create policy "Users delete own message attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'message-attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
