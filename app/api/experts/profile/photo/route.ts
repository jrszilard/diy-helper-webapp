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
        JSON.stringify({ error: 'File too large. Maximum is 5 MB.' }),
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
