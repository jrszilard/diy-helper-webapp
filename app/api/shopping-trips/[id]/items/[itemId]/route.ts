import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { UpdateTripItemSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(UpdateTripItemSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.purchased === true) {
    update.purchased_at = new Date().toISOString();
  } else if (parsed.data.purchased === false) {
    update.purchased_at = null;
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trip_items')
    .update(update)
    .eq('id', itemId)
    .eq('trip_id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating trip item', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to update item' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // Check if all items in this trip are purchased — auto-complete the trip
  const { data: allItems } = await auth.supabaseClient
    .from('shopping_trip_items')
    .select('purchased')
    .eq('trip_id', id);

  const allPurchased = allItems && allItems.length > 0 && allItems.every(i => i.purchased);
  if (allPurchased) {
    await auth.supabaseClient
      .from('shopping_trips')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ item: data, trip_completed: allPurchased }),
    { headers: { 'Content-Type': 'application/json' } }
  ));
}
