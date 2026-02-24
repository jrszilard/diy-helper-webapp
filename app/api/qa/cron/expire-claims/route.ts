import { NextRequest } from 'next/server';
import { releaseExpiredClaims, autoAcceptAnswered } from '@/lib/marketplace/qa-helpers';
import { getAdminClient } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = getAdminClient();

    // Release expired claims (refund + re-queue or expire)
    const claimResults = await releaseExpiredClaims(adminClient);

    // Auto-accept answered questions past deadline
    const autoAccepted = await autoAcceptAnswered(adminClient);

    const summary = {
      expiredClaimsReleased: claimResults.released,
      expiredClaimsRefunded: claimResults.refunded,
      directQuestionsExpired: claimResults.expired,
      autoAccepted,
    };

    logger.info('Cron: expire-claims completed', summary);

    return new Response(
      JSON.stringify({ success: true, ...summary }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Cron expire-claims error', error);
    return new Response(
      JSON.stringify({ error: 'Cron job failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Also support GET for Vercel Cron (Vercel sends GET requests for crons)
export async function GET(req: NextRequest) {
  return POST(req);
}
