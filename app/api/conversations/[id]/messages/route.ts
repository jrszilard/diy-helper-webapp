import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { AddMessageSchema, parseRequestBody } from '@/lib/validation';
import { addMessage, getConversationMessages } from '@/lib/chat-history';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const before = url.searchParams.get('before') || undefined;

  try {
    const messages = await getConversationMessages(
      auth.supabaseClient,
      id,
      Math.min(limit, 500),
      before
    );

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ messages }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error: unknown) {
    console.error('Error fetching messages:', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const body = await req.json();
  const parsed = parseRequestBody(AddMessageSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  try {
    const message = await addMessage(
      auth.supabaseClient,
      id,
      parsed.data.role,
      parsed.data.content,
      parsed.data.metadata
    );

    return applyCorsHeaders(req, new Response(
      JSON.stringify(message),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error: unknown) {
    console.error('Error adding message:', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
