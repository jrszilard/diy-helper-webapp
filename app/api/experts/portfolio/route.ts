import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { getExpertByUserId } from '@/lib/marketplace/expert-helpers';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { parseRequestBody } from '@/lib/validation';

const PortfolioImageSchema = z.object({
  imageUrl: z.string().url().max(500),
  caption: z.string().max(200).optional(),
  projectType: z.string().max(50).optional(),
});

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
    const parsed = parseRequestBody(PortfolioImageSchema, body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: parsed.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Verify user is an expert
    const expert = await getExpertByUserId(auth.supabaseClient, auth.userId);
    if (!expert) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Expert profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { data: portfolio, error } = await auth.supabaseClient
      .from('expert_portfolio')
      .insert({
        expert_id: expert.id,
        image_url: parsed.data.imageUrl,
        caption: parsed.data.caption || null,
        project_type: parsed.data.projectType || null,
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to save portfolio image', error);
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Failed to save portfolio image' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ id: portfolio.id }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Portfolio POST error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
