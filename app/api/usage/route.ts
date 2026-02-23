import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { applyCorsHeaders, handleCorsOptions } from '@/lib/cors';
import { checkRateLimit } from '@/lib/rate-limit';
import { freemium } from '@/lib/config';
import { logger } from '@/lib/logger';

function getPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthFromRequest(req);
    if (!auth.userId) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rateLimitResult = checkRateLimit(req, auth.userId, 'usage');
    if (!rateLimitResult.allowed) {
      return applyCorsHeaders(req, new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rateLimitResult.retryAfter) } }
      ));
    }

    const periodStart = getPeriodStart();

    // Get subscription tier
    const { data: sub } = await auth.supabaseClient
      .from('user_subscriptions')
      .select('tier, status')
      .eq('user_id', auth.userId)
      .single();

    const tier = sub?.tier === 'pro' && sub?.status === 'active' ? 'pro' : 'free';

    // Get usage counts for current period
    const { data: usageRows } = await auth.supabaseClient
      .from('usage_tracking')
      .select('usage_type, count')
      .eq('user_id', auth.userId)
      .eq('period_start', periodStart);

    const usageMap: Record<string, number> = {};
    for (const row of usageRows || []) {
      usageMap[row.usage_type] = row.count;
    }

    const usage = {
      reports: {
        used: usageMap['report'] ?? 0,
        limit: tier === 'pro' ? Infinity : freemium.freeReportsPerMonth,
      },
      chatMessages: {
        used: usageMap['chat_message'] ?? 0,
        limit: tier === 'pro' ? Infinity : freemium.freeChatMessagesPerMonth,
      },
      savedProjects: {
        used: usageMap['saved_project'] ?? 0,
        limit: tier === 'pro' ? Infinity : freemium.freeSavedProjects,
      },
    };

    return applyCorsHeaders(req, new Response(
      JSON.stringify({ usage, tier }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));
  } catch (error) {
    logger.error('Usage API error', error);
    return applyCorsHeaders(req, new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
}

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}
