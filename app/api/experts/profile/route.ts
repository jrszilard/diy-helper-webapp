import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { UpdateExpertProfileSchema } from '@/lib/marketplace/validation';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'experts');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const profile = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!profile) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ profile }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert profile GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'experts');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const body = await req.json();
    const parsed = parseRequestBody(UpdateExpertProfileSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get existing profile
    const existing = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!existing) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { specialties, ...updateFields } = parsed.data;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updateFields.displayName !== undefined) updateData.display_name = updateFields.displayName;
    if (updateFields.bio !== undefined) updateData.bio = updateFields.bio;
    if (updateFields.city !== undefined) updateData.city = updateFields.city;
    if (updateFields.state !== undefined) updateData.state = updateFields.state;
    if (updateFields.zipCode !== undefined) updateData.zip_code = updateFields.zipCode;
    if (updateFields.serviceRadiusMiles !== undefined) updateData.service_radius_miles = updateFields.serviceRadiusMiles;
    if (updateFields.hourlyRateCents !== undefined) updateData.hourly_rate_cents = updateFields.hourlyRateCents;
    if (updateFields.qaRateCents !== undefined) updateData.qa_rate_cents = updateFields.qaRateCents;
    if (updateFields.isAvailable !== undefined) updateData.is_available = updateFields.isAvailable;
    if (updateFields.profilePhotoUrl !== undefined) updateData.profile_photo_url = updateFields.profilePhotoUrl;

    const { error: updateError } = await auth.supabaseClient
      .from('expert_profiles')
      .update(updateData)
      .eq('id', existing.id);

    if (updateError) {
      logger.error('Failed to update expert profile', updateError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to update profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Update specialties if provided
    if (specialties) {
      // Delete old specialties
      await auth.supabaseClient
        .from('expert_specialties')
        .delete()
        .eq('expert_id', existing.id);

      // Insert new specialties
      const specialtyRows = specialties.map(s => ({
        expert_id: existing.id,
        specialty: s.specialty,
        years_experience: s.yearsExperience ?? null,
        is_primary: s.isPrimary,
      }));

      const { error: specError } = await auth.supabaseClient
        .from('expert_specialties')
        .insert(specialtyRows);

      if (specError) {
        logger.error('Failed to update specialties', specError);
      }
    }

    // Return updated profile
    const updated = await getExpertByUserId(auth.supabaseClient, auth.userId);

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ profile: updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert profile PUT error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
