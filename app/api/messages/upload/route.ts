import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
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

    const rateLimitResult = checkRateLimit(req, auth.userId, 'messages');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'No file provided. Send a "file" field in multipart/form-data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: `Invalid file type "${file.type}". Allowed: jpeg, png, webp, gif.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const extension = MIME_TO_EXT[file.type] || 'bin';
    const fileName = `${crypto.randomUUID()}.${extension}`;
    const filePath = `${auth.userId}/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const adminClient = getAdminClient();
    const { error: uploadError } = await adminClient.storage
      .from('message-attachments')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      logger.error('Failed to upload message attachment', uploadError, {
        userId: auth.userId,
        fileType: file.type,
        fileSize: file.size,
      });
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: publicUrlData } = adminClient.storage
      .from('message-attachments')
      .getPublicUrl(filePath);

    logger.info('Message attachment uploaded', {
      userId: auth.userId,
      filePath,
      fileSize: file.size,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ url: publicUrlData.publicUrl }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Upload POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
