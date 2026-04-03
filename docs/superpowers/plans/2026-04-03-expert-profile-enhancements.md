# Expert Profile Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add credential fields, profile photo upload, and answer form improvements to the expert profile system.

**Architecture:** One DB migration adds credential columns and an expert-photos storage bucket. The existing upload infrastructure (FileUpload component, message-attachments pattern) is reused for the new photo upload endpoint. Profile form, answer form, and validation schema are updated to support the new fields.

**Tech Stack:** Next.js (App Router), React, TypeScript, Supabase (PostgreSQL + Storage), Tailwind CSS, Zod

---

## File Map

| Task | Action | File | Purpose |
|------|--------|------|---------|
| 1 | Create | `supabase/migrations/20260403000000_expert_credentials_and_photos.sql` | Add credential columns + expert-photos bucket |
| 2 | Modify | `lib/marketplace/types.ts:12-39` | Add credential fields to ExpertProfile interface |
| 2 | Modify | `lib/marketplace/validation.ts:22-38` | Add credential fields to UpdateExpertProfileSchema |
| 2 | Modify | `app/api/experts/profile/route.ts:88-98` | Map new fields in PUT handler |
| 3 | Modify | `app/experts/dashboard/profile/page.tsx` | Add Credentials section + photo upload to profile form |
| 4 | Create | `app/api/experts/profile/photo/route.ts` | Photo upload endpoint (reuses message-attachments pattern) |
| 5 | Modify | `components/marketplace/QAAnswerForm.tsx` | Increase char limit to 5000, add markdown preview toggle, replace URL textarea with FileUpload |
| 5 | Modify | `lib/marketplace/validation.ts:55-60` | Increase AnswerQuestionSchema max to 5000 |

---

### Task 1: DB Migration — Credential Columns + Expert Photos Bucket

**Files:**
- Create: `supabase/migrations/20260403000000_expert_credentials_and_photos.sql`

- [ ] **Step 1: Create migration file**

```sql
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
```

- [ ] **Step 2: Apply migration locally**

Run: `cd /home/justin/lakeshore-studio/ai-projects/diy-helper-webapp && npx supabase db push`

If using local Supabase: `npx supabase migration up`

If neither works (no local Supabase CLI), apply manually via Supabase dashboard SQL editor, then continue.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403000000_expert_credentials_and_photos.sql
git commit -m "feat: add credential columns and expert-photos storage bucket

Adds license_number, license_type, license_state, insurance_status
to expert_profiles. Creates expert-photos storage bucket with RLS
policies for authenticated upload and public read.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Types, Validation, and API — Credential Fields

Update the TypeScript types, Zod validation schema, and API PUT handler to support the new credential fields.

**Files:**
- Modify: `lib/marketplace/types.ts:12-39`
- Modify: `lib/marketplace/validation.ts:22-38`
- Modify: `app/api/experts/profile/route.ts:88-98`

- [ ] **Step 1: Add credential fields to ExpertProfile interface**

In `lib/marketplace/types.ts`, add 4 fields to the `ExpertProfile` interface (after `isAvailable` on line 35, before `specialties`):

```typescript
  licenseNumber: string | null;
  licenseType: string | null;
  licenseState: string | null;
  insuranceStatus: 'insured' | 'bonded_insured' | null;
```

- [ ] **Step 2: Add credential fields to UpdateExpertProfileSchema**

In `lib/marketplace/validation.ts`, add to the `UpdateExpertProfileSchema` object (after line 32, `profilePhotoUrl`):

```typescript
  licenseNumber: z.string().max(50).nullable().optional(),
  licenseType: z.string().max(100).nullable().optional(),
  licenseState: z.string().max(2).nullable().optional(),
  insuranceStatus: z.enum(['insured', 'bonded_insured']).nullable().optional(),
```

- [ ] **Step 3: Map new fields in profile PUT handler**

In `app/api/experts/profile/route.ts`, add field mappings after line 98 (`profilePhotoUrl`):

```typescript
    if (updateFields.licenseNumber !== undefined) updateData.license_number = updateFields.licenseNumber;
    if (updateFields.licenseType !== undefined) updateData.license_type = updateFields.licenseType;
    if (updateFields.licenseState !== undefined) updateData.license_state = updateFields.licenseState;
    if (updateFields.insuranceStatus !== undefined) updateData.insurance_status = updateFields.insuranceStatus;
```

- [ ] **Step 4: Update the toExpertProfile conversion function**

Find the `toExpertProfile` function in `lib/marketplace/types.ts` (or `lib/marketplace/expert-helpers.ts`) that converts snake_case DB rows to camelCase. Add the 4 new field mappings:

```typescript
  licenseNumber: row.license_number ?? null,
  licenseType: row.license_type ?? null,
  licenseState: row.license_state ?? null,
  insuranceStatus: row.insurance_status ?? null,
```

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add lib/marketplace/types.ts lib/marketplace/validation.ts app/api/experts/profile/route.ts
git commit -m "feat: add credential fields to types, validation, and API

ExpertProfile now includes licenseNumber, licenseType, licenseState,
insuranceStatus. Profile PUT endpoint maps these to DB columns.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

If the `toExpertProfile` function is in `lib/marketplace/expert-helpers.ts`, add that file to the git add command.

---

### Task 3: Profile Form — Credentials Section + Photo Upload

Add a Credentials section and photo upload to the expert profile edit form.

**Files:**
- Modify: `app/experts/dashboard/profile/page.tsx`

- [ ] **Step 1: Add credential state variables**

In `app/experts/dashboard/profile/page.tsx`, after the existing form field state declarations (around line 44), add:

```typescript
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [insuranceStatus, setInsuranceStatus] = useState<string>('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
```

- [ ] **Step 2: Populate credential state from fetched profile**

In the `fetchProfile` function (after line 68, `setSpecialties(...)`), add:

```typescript
        setLicenseNumber(p.licenseNumber || '');
        setLicenseType(p.licenseType || '');
        setLicenseState(p.licenseState || '');
        setInsuranceStatus(p.insuranceStatus || '');
        setProfilePhotoUrl(p.profilePhotoUrl || null);
```

- [ ] **Step 3: Include credentials in save payload**

In the `handleSave` function (after line 98, before `if (hourlyRate)`), add the credential fields to the body:

```typescript
      if (licenseNumber) body.licenseNumber = licenseNumber;
      else body.licenseNumber = null;
      if (licenseType) body.licenseType = licenseType;
      else body.licenseType = null;
      if (licenseState) body.licenseState = licenseState;
      else body.licenseState = null;
      if (insuranceStatus) body.insuranceStatus = insuranceStatus;
      else body.insuranceStatus = null;
      if (profilePhotoUrl) body.profilePhotoUrl = profilePhotoUrl;
```

- [ ] **Step 4: Add photo upload handler**

Add a photo upload function before the `handleSave` function:

```typescript
  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/experts/profile/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setProfilePhotoUrl(data.url);
        setToast({ type: 'success', message: 'Photo uploaded' });
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ type: 'error', message: data.error || 'Failed to upload photo' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to upload photo' });
    }
    setUploadingPhoto(false);
    setTimeout(() => setToast(null), 4000);
  };
```

- [ ] **Step 5: Add photo upload UI in the JSX**

Add an `Avatar` import at the top, and `Camera` from lucide-react. Then add a photo section at the top of the form (after line 179, before the Display Name input):

```tsx
        {/* Profile Photo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-earth-sand" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-earth-tan flex items-center justify-center text-xl font-bold text-earth-brown">
                {displayName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                }}
              />
              <span className="text-sm font-medium text-terracotta hover:text-terracotta/80 transition-colors">
                {uploadingPhoto ? 'Uploading...' : profilePhotoUrl ? 'Change photo' : 'Upload photo'}
              </span>
            </label>
            <p className="text-xs text-earth-brown mt-0.5">JPG, PNG, or WebP. Max 5 MB.</p>
          </div>
        </div>
```

- [ ] **Step 6: Add Credentials section in the JSX**

Add a Credentials section after the Rates section (after the Zip Code / Service Radius grid). Use a `Card` wrapper:

```tsx
        {/* Credentials */}
        <Card padding="sm">
          <h3 className="text-sm font-semibold text-foreground mb-3">Credentials</h3>
          <p className="text-xs text-earth-brown mb-3">Optional — helps build trust with DIYers</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                id="profile-license-type"
                label="License Type"
                type="text"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                placeholder="e.g., Master Electrician"
                fullWidth
                maxLength={100}
              />
              <TextInput
                id="profile-license-number"
                label="License Number"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g., EL-12345"
                fullWidth
                maxLength={50}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                id="profile-license-state"
                label="License State"
                value={licenseState}
                onChange={(e) => setLicenseState(e.target.value)}
                fullWidth
              >
                <option value="">Select...</option>
                {US_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select
                id="profile-insurance"
                label="Insurance Status"
                value={insuranceStatus}
                onChange={(e) => setInsuranceStatus(e.target.value)}
                fullWidth
              >
                <option value="">Not specified</option>
                <option value="insured">Insured</option>
                <option value="bonded_insured">Bonded & Insured</option>
              </Select>
            </div>
          </div>
        </Card>
```

- [ ] **Step 7: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 8: Commit**

```bash
git add app/experts/dashboard/profile/page.tsx
git commit -m "feat: add credentials section and photo upload to profile form

Experts can now upload a profile photo and enter license type,
number, state, and insurance status. Photo uploads use the new
expert-photos endpoint.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Photo Upload API Endpoint

Create the expert profile photo upload endpoint. Follows the same pattern as `/api/messages/upload/route.ts`.

**Files:**
- Create: `app/api/experts/profile/photo/route.ts`

- [ ] **Step 1: Create the photo upload endpoint**

```typescript
import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = await checkRateLimit(req, auth.userId, 'experts');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    // Verify user is an expert
    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No file provided.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: `Invalid file type "${file.type}". Allowed: jpeg, png, webp.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (file.size > MAX_FILE_SIZE) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: `File too large. Maximum is 5 MB.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const extension = MIME_TO_EXT[file.type] || 'bin';
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `${auth.userId}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const adminClient = getAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from('expert-photos')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      logger.error('Failed to upload expert photo', uploadError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: publicUrlData } = adminClient.storage
      .from('expert-photos')
      .getPublicUrl(filePath);

    // Update profile_photo_url on expert profile
    await adminClient
      .from('expert_profiles')
      .update({ profile_photo_url: publicUrlData.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', expert.id);

    logger.info('Expert photo uploaded', { userId: auth.userId, filePath });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ url: publicUrlData.publicUrl }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert photo upload error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
git add app/api/experts/profile/photo/route.ts
git commit -m "feat: add expert profile photo upload endpoint

POST /api/experts/profile/photo accepts multipart form data,
uploads to expert-photos bucket, and updates profile_photo_url.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Answer Form Improvements

Increase character limit from 2000 to 5000, add markdown preview toggle, replace manual URL textarea with proper photo upload using FileUpload component.

**Files:**
- Modify: `lib/marketplace/validation.ts:55-60`
- Modify: `components/marketplace/QAAnswerForm.tsx`

- [ ] **Step 1: Update AnswerQuestionSchema char limit**

In `lib/marketplace/validation.ts`, line 56, change:

```typescript
  answerText: z.string().min(50, 'Please provide a more detailed answer').max(2000),
```

To:

```typescript
  answerText: z.string().min(50, 'Please provide a more detailed answer').max(5000),
```

- [ ] **Step 2: Update QAAnswerForm character limit and counter**

In `components/marketplace/QAAnswerForm.tsx`:

Line 24, change `charCount <= 2000` to `charCount <= 5000`:
```typescript
  const isValid = charCount >= 50 && charCount <= 5000;
```

Line 103, change `charCount > 2000` to `charCount > 5000`:
```typescript
            charCount < 50 ? 'text-terracotta' : charCount > 5000 ? 'text-red-600' : 'text-muted'
```

Line 105, change `2000` to `5,000`:
```typescript
            {charCount}/5,000 characters (minimum 50)
```

- [ ] **Step 3: Add markdown preview toggle**

Add imports at the top of `QAAnswerForm.tsx`:

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Edit3 } from 'lucide-react';
```

Add preview state:
```typescript
  const [showPreview, setShowPreview] = useState(false);
```

Replace the textarea section (lines 83-107) with a tabbed Write/Preview interface:

```tsx
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${!showPreview ? 'bg-earth-tan text-foreground' : 'text-earth-brown hover:text-foreground'}`}
              >
                <Edit3 size={12} className="inline mr-1" />Write
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${showPreview ? 'bg-earth-tan text-foreground' : 'text-earth-brown hover:text-foreground'}`}
              >
                <Eye size={12} className="inline mr-1" />Preview
              </button>
            </div>
            <Button
              variant="tertiary"
              size="sm"
              leftIcon={Wrench}
              onClick={() => setIsToolsOpen(true)}
            >
              Expert Tools
            </Button>
          </div>
          {showPreview ? (
            <div className="border border-earth-sand rounded-lg p-4 min-h-[150px] prose prose-sm max-w-none">
              {answerText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{answerText}</ReactMarkdown>
              ) : (
                <p className="text-earth-brown italic">Nothing to preview yet...</p>
              )}
            </div>
          ) : (
            <Textarea
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              rows={8}
              fullWidth
              resize="none"
              placeholder="Provide a detailed answer. You can use **bold**, *italic*, - lists, and ## headings."
            />
          )}
          <p className={`text-xs mt-1 ${
            charCount < 50 ? 'text-terracotta' : charCount > 5000 ? 'text-red-600' : 'text-muted'
          }`}>
            {charCount}/5,000 characters (minimum 50)
          </p>
        </div>
```

- [ ] **Step 4: Replace URL textarea with file upload**

Replace the photo URLs textarea (lines 109-117) with a file upload using a simple file input (consistent with profile photo pattern):

```tsx
        {/* Answer Photos */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Photos (optional, max 3)</label>
          <div className="flex flex-wrap gap-2">
            {photoUrls.split('\n').filter(Boolean).map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={url} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded object-cover border border-earth-sand" />
                <button
                  type="button"
                  onClick={() => setPhotoUrls(photoUrls.split('\n').filter((_, j) => j !== i).join('\n'))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center"
                >
                  x
                </button>
              </div>
            ))}
            {photoUrls.split('\n').filter(Boolean).length < 3 && (
              <label className="w-16 h-16 border-2 border-dashed border-earth-sand rounded flex items-center justify-center cursor-pointer hover:border-terracotta transition-colors">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const token = (await supabase.auth.getSession()).data.session?.access_token;
                    if (!token) return;
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/messages/upload', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    });
                    if (res.ok) {
                      const data = await res.json();
                      const existing = photoUrls.split('\n').filter(Boolean);
                      setPhotoUrls([...existing, data.url].join('\n'));
                    }
                  }}
                />
                <Plus size={16} className="text-earth-brown" />
              </label>
            )}
          </div>
          <p className="text-xs text-earth-brown mt-1">JPG, PNG, or WebP. Max 5 MB each.</p>
        </div>
```

Add `Plus` to the lucide-react import if not already present.

- [ ] **Step 5: Verify build**

Run: `npx next build 2>&1 | tail -20`

- [ ] **Step 6: Commit**

```bash
git add lib/marketplace/validation.ts components/marketplace/QAAnswerForm.tsx
git commit -m "feat: improve answer form — 5000 char limit, markdown preview, photo upload

Increased answer character limit from 2000 to 5000. Added Write/Preview
toggle with markdown rendering. Replaced manual URL entry with file
upload for answer photos (max 3, uses message-attachments bucket).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
