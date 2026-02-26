import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

/**
 * GET /api/experts/[id]/availability — Get an expert's available consultation slots.
 * Public — any authenticated user can view availability.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = getAdminClient();

    // Get expert's active slots
    const { data: slots, error } = await adminClient
      .from('expert_consultation_slots')
      .select('id, day_of_week, start_time, end_time, timezone, slot_duration_minutes')
      .eq('expert_id', id)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time');

    if (error) {
      logger.error('Failed to fetch availability', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to fetch availability' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get expert's hourly rate for pricing
    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('hourly_rate_cents, display_name')
      .eq('id', id)
      .single();

    // Calculate slot prices based on hourly rate and duration
    const hourlyRateCents = expert?.hourly_rate_cents || 7500; // default $75/hr
    const platformFeeRate = 0.15; // 15% for consultations

    const formattedSlots = (slots || []).map(slot => {
      const durationFraction = slot.slot_duration_minutes / 60;
      const priceCents = Math.round(hourlyRateCents * durationFraction);
      const platformFeeCents = Math.round(priceCents * platformFeeRate);

      return {
        id: slot.id,
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
        timezone: slot.timezone,
        durationMinutes: slot.slot_duration_minutes,
        priceCents,
        platformFeeCents,
        expertPayoutCents: priceCents - platformFeeCents,
      };
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        expertName: expert?.display_name || 'Expert',
        hourlyRateCents,
        slots: formattedSlots,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Availability GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

/**
 * PUT /api/experts/[id]/availability — Update an expert's consultation slots.
 * Expert-only (must own the profile).
 * Body: { slots: Array<{ dayOfWeek, startTime, endTime, timezone, durationMinutes }> }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { id } = await params;
    const adminClient = getAdminClient();

    // Verify ownership
    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!expert || expert.user_id !== auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body = await req.json();
    const { slots } = body as {
      slots: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        timezone: string;
        durationMinutes: number;
      }>;
    };

    if (!Array.isArray(slots)) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'slots must be an array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Deactivate all existing slots
    await adminClient
      .from('expert_consultation_slots')
      .update({ is_active: false })
      .eq('expert_id', id);

    // Insert new slots
    if (slots.length > 0) {
      const insertData = slots.map(s => ({
        expert_id: id,
        day_of_week: s.dayOfWeek,
        start_time: s.startTime,
        end_time: s.endTime,
        timezone: s.timezone || 'America/New_York',
        slot_duration_minutes: s.durationMinutes || 30,
        is_active: true,
      }));

      const { error: insertErr } = await adminClient
        .from('expert_consultation_slots')
        .upsert(insertData, { onConflict: 'expert_id,day_of_week,start_time' });

      if (insertErr) {
        logger.error('Failed to insert slots', insertErr);
        return applyCorsHeaders(req, new Response(
          JSON.stringify({ error: 'Failed to update availability' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ message: 'Availability updated', slotCount: slots.length }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Availability PUT error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
