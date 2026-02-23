import { NextRequest } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertById } from '@/lib/marketplace/expert-helpers';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = checkRateLimit(req, null, 'marketplace');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const { id } = await params;
    const adminClient = getAdminClient();

    const profile = await getExpertById(adminClient, id);
    if (!profile || !profile.isActive) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Return public profile (exclude sensitive fields)
    const publicProfile = {
      id: profile.id,
      displayName: profile.displayName,
      bio: profile.bio,
      profilePhotoUrl: profile.profilePhotoUrl,
      city: profile.city,
      state: profile.state,
      serviceRadiusMiles: profile.serviceRadiusMiles,
      verificationLevel: profile.verificationLevel,
      verificationStatus: profile.verificationStatus,
      hourlyRateCents: profile.hourlyRateCents,
      qaRateCents: profile.qaRateCents,
      avgRating: profile.avgRating,
      totalReviews: profile.totalReviews,
      responseTimeHours: profile.responseTimeHours,
      isAvailable: profile.isAvailable,
      specialties: profile.specialties,
      createdAt: profile.createdAt,
    };

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ profile: publicProfile }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Expert public profile GET error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
