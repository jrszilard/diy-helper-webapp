import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { chargeQAQuestion } from '@/lib/stripe';
import { createNotification } from '@/lib/notifications';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CONSULTATION_FEE_RATE = 0.15; // 15% platform fee

const BookConsultationSchema = z.object({
  expertId: z.string().uuid(),
  scheduledStart: z.string().datetime(),
  durationMinutes: z.number().int().refine(v => [15, 30, 60].includes(v), 'Must be 15, 30, or 60 minutes'),
  timezone: z.string().min(1),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(5).optional(),
  reportId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  qaQuestionId: z.string().uuid().optional(),
  paymentMethodId: z.string().min(1),
  stripeCustomerId: z.string().min(1),
});

/**
 * GET /api/consultations — List user's consultations (as DIYer or expert).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const adminClient = getAdminClient();

    // Get as DIYer
    const { data: diyerConsultations } = await adminClient
      .from('consultations')
      .select(`
        id, expert_id, scheduled_start, scheduled_end, duration_minutes, timezone,
        diyer_notes, status, price_cents, created_at,
        expert_profiles!inner(display_name, profile_photo_url, avg_rating)
      `)
      .eq('diyer_user_id', auth.userId)
      .order('scheduled_start', { ascending: false })
      .limit(20);

    // Get as expert
    const { data: expertProfile } = await adminClient
      .from('expert_profiles')
      .select('id')
      .eq('user_id', auth.userId)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let expertConsultations: any[] = [];
    if (expertProfile) {
      const { data } = await adminClient
        .from('consultations')
        .select(`
          id, diyer_user_id, scheduled_start, scheduled_end, duration_minutes, timezone,
          diyer_notes, diyer_photos, status, price_cents, expert_payout_cents, created_at
        `)
        .eq('expert_id', expertProfile.id)
        .order('scheduled_start', { ascending: false })
        .limit(20);
      expertConsultations = data || [];
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        asCustomer: (diyerConsultations || []).map(c => {
          const ep = c.expert_profiles as unknown as { display_name: string; profile_photo_url: string | null };
          return {
          id: c.id,
          expertId: c.expert_id,
          expertName: ep?.display_name,
          expertPhoto: ep?.profile_photo_url,
          scheduledStart: c.scheduled_start,
          scheduledEnd: c.scheduled_end,
          durationMinutes: c.duration_minutes,
          timezone: c.timezone,
          notes: c.diyer_notes,
          status: c.status,
          priceCents: c.price_cents,
          createdAt: c.created_at,
        };
        }),
        asExpert: (expertConsultations || []).map(c => ({
          id: c.id,
          diyerUserId: c.diyer_user_id,
          scheduledStart: c.scheduled_start,
          scheduledEnd: c.scheduled_end,
          durationMinutes: c.duration_minutes,
          timezone: c.timezone,
          notes: c.diyer_notes,
          photos: c.diyer_photos,
          status: c.status,
          priceCents: c.price_cents,
          expertPayoutCents: c.expert_payout_cents,
          createdAt: c.created_at,
        })),
      }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Consultations GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

/**
 * POST /api/consultations — Book a new consultation.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const body = await req.json();
    const parsed = BookConsultationSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid booking data', details: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const data = parsed.data;
    const adminClient = getAdminClient();

    // Get expert profile and verify they exist / are active
    const { data: expert } = await adminClient
      .from('expert_profiles')
      .select('id, user_id, display_name, hourly_rate_cents, is_active, is_available')
      .eq('id', data.expertId)
      .single();

    if (!expert || !expert.is_active) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert not found or unavailable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!expert.is_available) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert is currently not accepting bookings' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Calculate pricing
    const hourlyRateCents = expert.hourly_rate_cents || 7500;
    const durationFraction = data.durationMinutes / 60;
    const priceCents = Math.round(hourlyRateCents * durationFraction);
    const platformFeeCents = Math.round(priceCents * CONSULTATION_FEE_RATE);
    const expertPayoutCents = priceCents - platformFeeCents;

    // Verify scheduled time is in the future
    const scheduledStart = new Date(data.scheduledStart);
    if (scheduledStart <= new Date()) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Consultation must be scheduled in the future' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check no conflicting bookings for this expert at the same time
    const scheduledEnd = new Date(scheduledStart.getTime() + data.durationMinutes * 60 * 1000);
    const { data: conflicts } = await adminClient
      .from('consultations')
      .select('id')
      .eq('expert_id', data.expertId)
      .not('status', 'in', '("cancelled","rejected")')
      .lt('scheduled_start', scheduledEnd.toISOString())
      .gt('scheduled_end', scheduledStart.toISOString());

    if (conflicts && conflicts.length > 0) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'This time slot is no longer available' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Charge the DIYer
    let paymentIntentId: string | null = null;
    try {
      const charge = await chargeQAQuestion({
        amountCents: priceCents,
        customerId: data.stripeCustomerId,
        paymentMethodId: data.paymentMethodId,
        metadata: {
          type: 'consultation',
          expert_id: data.expertId,
          duration_minutes: String(data.durationMinutes),
        },
      });
      paymentIntentId = charge.paymentIntentId;
    } catch (chargeErr) {
      logger.error('Consultation charge failed', chargeErr);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Payment failed. Please check your payment method.' }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Create the consultation
    const { data: consultation, error: insertErr } = await adminClient
      .from('consultations')
      .insert({
        diyer_user_id: auth.userId,
        expert_id: data.expertId,
        report_id: data.reportId || null,
        project_id: data.projectId || null,
        qa_question_id: data.qaQuestionId || null,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        duration_minutes: data.durationMinutes,
        timezone: data.timezone,
        diyer_notes: data.notes || null,
        diyer_photos: data.photos || [],
        price_cents: priceCents,
        platform_fee_cents: platformFeeCents,
        expert_payout_cents: expertPayoutCents,
        status: 'confirmed',
        payment_intent_id: paymentIntentId,
        payout_status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr || !consultation) {
      logger.error('Failed to create consultation', insertErr);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to create booking' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Notify the expert
    await createNotification({
      userId: expert.user_id,
      type: 'consultation_booked',
      title: `New ${data.durationMinutes}-minute consultation booked`,
      body: `Scheduled for ${scheduledStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
      link: '/experts/dashboard',
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        consultationId: consultation.id,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        priceCents,
        expertPayoutCents,
        paymentIntentId,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Consultation POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
