import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { handleCorsOptions, applyCorsHeaders } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { CreateShoppingTripSchema, parseRequestBody } from '@/lib/validation';
import { logger } from '@/lib/logger';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest) {
  const auth = await getAuthFromRequest(req);
  if (!auth.userId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const projectId = req.nextUrl.searchParams.get('project_id');
  if (!projectId) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'project_id is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const { data, error } = await auth.supabaseClient
    .from('shopping_trips')
    .select('id, project_id, name, status, created_at, completed_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Error fetching shopping trips', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  const tripsWithProgress = await Promise.all(
    (data || []).map(async (trip) => {
      const { data: items } = await auth.supabaseClient
        .from('shopping_trip_items')
        .select('purchased, estimated_price, quantity')
        .eq('trip_id', trip.id);

      const totalItems = items?.length || 0;
      const purchasedItems = items?.filter(i => i.purchased).length || 0;
      const totalEstimate = items?.reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;
      const spentEstimate = items?.filter(i => i.purchased).reduce((sum, i) => sum + ((i.estimated_price || 0) * i.quantity), 0) || 0;

      return {
        ...trip,
        total_items: totalItems,
        purchased_items: purchasedItems,
        total_estimate: totalEstimate,
        spent_estimate: spentEstimate,
      };
    })
  );

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trips: tripsWithProgress }),
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

  const rateLimitResult = await checkRateLimit(req, auth.userId, 'shopping_trips');
  if (!rateLimitResult.allowed) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Too many requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
    ));
  }

  const body = await req.json();
  const parsed = parseRequestBody(CreateShoppingTripSchema, body);
  if (!parsed.success) {
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: parsed.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 1. Create the trip
  const { data: trip, error: tripError } = await auth.supabaseClient
    .from('shopping_trips')
    .insert({
      project_id: parsed.data.project_id,
      user_id: auth.userId,
      name: parsed.data.name,
      status: 'active',
    })
    .select()
    .single();

  if (tripError) {
    logger.error('Error creating shopping trip', tripError);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Failed to create trip' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 2. Snapshot current shopping_list_items for this project
  const { data: sourceItems, error: itemsError } = await auth.supabaseClient
    .from('shopping_list_items')
    .select('product_name, quantity, category, price, notes')
    .eq('project_id', parsed.data.project_id);

  if (itemsError) {
    logger.error('Error fetching source materials', itemsError);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ trip, items: [], warning: 'Trip created but failed to snapshot items' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  }

  // 3. Insert snapshotted items
  const tripItems = (sourceItems || []).map(item => ({
    trip_id: trip.id,
    product_name: item.product_name,
    quantity: item.quantity || 1,
    category: item.category,
    estimated_price: item.price,
    purchased: false,
    notes: item.notes,
  }));

  if (tripItems.length > 0) {
    const { error: insertError } = await auth.supabaseClient
      .from('shopping_trip_items')
      .insert(tripItems);

    if (insertError) {
      logger.error('Error inserting trip items', insertError);
    }
  }

  return applyCorsHeaders(req, new Response(
    JSON.stringify({ trip, items_count: tripItems.length }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  ));
}
