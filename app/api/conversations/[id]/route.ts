import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { UpdateConversationSchema, parseRequestBody } from '@/lib/validation';

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

  const { data, error } = await auth.supabaseClient
    .from('conversations')
    .select('id, title, created_at, updated_at, project_id')
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: status === 404 ? 'Conversation not found' : error.message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function DELETE(
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

  // Delete messages first (cascade), then conversation
  await auth.supabaseClient
    .from('conversation_messages')
    .delete()
    .eq('conversation_id', id);

  const { error } = await auth.supabaseClient
    .from('conversations')
    .delete()
    .eq('id', id);

  if (error) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function PATCH(
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
  const parsed = parseRequestBody(UpdateConversationSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data, error } = await auth.supabaseClient
    .from('conversations')
    .update({ title: parsed.data.title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, updated_at')
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: status === 404 ? 'Conversation not found' : error.message }),
      { status, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify(data),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
