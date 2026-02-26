import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { buildExpertContext } from '@/lib/marketplace/context-builder';
import { getQuestionPricing } from '@/lib/marketplace/pricing-engine';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const PriceRequestSchema = z.object({
  reportId: z.string().uuid().optional(),
  category: z.string().min(1),
  questionText: z.string().min(1),
  photoCount: z.number().int().min(0).default(0),
});

// POST /api/qa/price — calculate price for a question before submission
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
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const body = await req.json();
    const parsed = PriceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { reportId, category, questionText, photoCount } = parsed.data;

    // Build AI context if report provided
    let context = null;
    if (reportId) {
      context = await buildExpertContext(auth.supabaseClient, reportId);
    }

    const pricing = getQuestionPricing({
      context,
      category,
      questionText,
      photoCount,
      userId: auth.userId,
    });

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ pricing }),
      { headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Q&A price calculation error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
