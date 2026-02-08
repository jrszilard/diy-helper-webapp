import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { CreateConversationSchema, parseRequestBody } from '@/lib/validation';
import { createConversation, generateTitle } from '@/lib/chat-history';

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const rateLimitResult = checkRateLimit(req, auth.userId, 'conversations');
  if (!rateLimitResult.allowed) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
    ));
  }

  const { data, error } = await auth.supabaseClient
    .from('conversations')
    .select('id, title, updated_at, project_id')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ conversations: data }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function POST(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const rateLimitResult = checkRateLimit(req, auth.userId, 'conversations');
  if (!rateLimitResult.allowed) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(CreateConversationSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  try {
    const title = parsed.data.title
      ? generateTitle(parsed.data.title)
      : 'New Conversation';

    const conversation = await createConversation(
      auth.supabaseClient,
      auth.userId,
      title,
      parsed.data.project_id
    );

    return applyCorsHeaders(req, new Response(
      JSON.stringify(conversation),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
