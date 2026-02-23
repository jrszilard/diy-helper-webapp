import { NextRequest } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdminClient } from '@/lib/supabase-admin';
import { toExpertProfile } from '@/lib/marketplace/types';
import type { ExpertProfileRow } from '@/lib/marketplace/types';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const rateLimitResult = checkRateLimit(req, null, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const url = new URL(req.url);
    const specialty = url.searchParams.get('specialty');
    const state = url.searchParams.get('state');
    const city = url.searchParams.get('city');
    const minRating = url.searchParams.get('minRating');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const adminClient = getAdminClient();

    let query = adminClient
      .from('expert_profiles')
      .select('*, expert_specialties(*)', { count: 'exact' })
      .eq('is_active', true);

    if (state) {
      query = query.ilike('state', state);
    }
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (minRating) {
      query = query.gte('avg_rating', parseFloat(minRating));
    }

    query = query
      .order('avg_rating', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Expert search error', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    let experts = (data || []).map(row => {
      const profile = toExpertProfile(row as ExpertProfileRow);
      return {
        id: profile.id,
        displayName: profile.displayName,
        bio: profile.bio,
        profilePhotoUrl: profile.profilePhotoUrl,
        city: profile.city,
        state: profile.state,
        verificationLevel: profile.verificationLevel,
        hourlyRateCents: profile.hourlyRateCents,
        qaRateCents: profile.qaRateCents,
        avgRating: profile.avgRating,
        totalReviews: profile.totalReviews,
        responseTimeHours: profile.responseTimeHours,
        isAvailable: profile.isAvailable,
        specialties: profile.specialties,
      };
    });

    // Filter by specialty in-memory (since it's in a join table)
    if (specialty) {
      experts = experts.filter(e =>
        e.specialties.some(s => s.specialty === specialty)
      );
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({
        experts,
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert search API error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
