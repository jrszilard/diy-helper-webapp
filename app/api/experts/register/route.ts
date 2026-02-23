import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { parseRequestBody } from '@/lib/validation';
import { ExpertRegistrationSchema } from '@/lib/marketplace/validation';
import { isExpert } from '@/lib/marketplace/expert-helpers';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
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
    const parsed = parseRequestBody(ExpertRegistrationSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Check if expert profile already exists
    const alreadyExpert = await isExpert(auth.supabaseClient, auth.userId);
    if (alreadyExpert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile already exists for this user' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { specialties, ...profileData } = parsed.data;

    // Insert expert profile
    const { data: profile, error: profileError } = await auth.supabaseClient
      .from('expert_profiles')
      .insert({
        user_id: auth.userId,
        display_name: profileData.displayName,
        bio: profileData.bio || null,
        city: profileData.city,
        state: profileData.state,
        zip_code: profileData.zipCode || null,
        service_radius_miles: profileData.serviceRadiusMiles,
        hourly_rate_cents: profileData.hourlyRateCents || null,
        qa_rate_cents: profileData.qaRateCents || null,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      logger.error('Failed to create expert profile', profileError);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to create expert profile' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Insert specialties
    const specialtyRows = specialties.map(s => ({
      expert_id: profile.id,
      specialty: s.specialty,
      years_experience: s.yearsExperience ?? null,
      is_primary: s.isPrimary,
    }));

    const { error: specError } = await auth.supabaseClient
      .from('expert_specialties')
      .insert(specialtyRows);

    if (specError) {
      logger.error('Failed to insert expert specialties', specError);
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ id: profile.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert registration error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
