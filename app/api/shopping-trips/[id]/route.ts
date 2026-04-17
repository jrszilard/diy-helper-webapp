import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { UpdateShoppingTripSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data: trip, error: tripError } = await auth.supabaseClient
    .from('shopping_trips')
    .select('*')
    .eq('id', id)
    .single();

  if (tripError) {
    const status = tripError.code === 'PGRST116' ? 404 : 500;
    logger.error('Error fetching trip', tripError);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: status === 404 ? 'Trip not found' : 'Internal server error' }),
      { status, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data: items, error: itemsError } = await auth.supabaseClient
    .from('shopping_trip_items')
    .select('*')
    .eq('trip_id', id)
    .order('category', { ascending: true });

  if (itemsError) {
    logger.error('Error fetching trip items', itemsError);
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip, items: items || [] }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(UpdateShoppingTripSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === 'completed') {
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trips')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating trip', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to update trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip: data }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { error } = await auth.supabaseClient
    .from('shopping_trips')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error('Error deleting trip', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to delete trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  return applyCorsHeaders(req, new Response(null, { status: 204 }));
}
