import { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase-admin';
import { freemium } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { UsageType, SubscriptionTier } from '@/lib/marketplace/types';

const LIMITS: Record<UsageType, number> = {
  report: freemium.freeReportsPerMonth,
  chat_message: freemium.freeChatMessagesPerMonth,
  saved_project: freemium.freeSavedProjects,
};

function getPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export async function checkUsageLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  type: UsageType,
): Promise<{ allowed: boolean; current: number; limit: number }> {
  // Check subscription tier
  const { data: sub } = await supabaseClient
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single();

  const tier: SubscriptionTier = sub?.tier === 'pro' && sub?.status === 'active' ? 'pro' : 'free';

  if (tier === 'pro') {
    return { allowed: true, current: 0, limit: Infinity };
  }

  const limit = LIMITS[type];
  const periodStart = getPeriodStart();

  const { data: usage } = await supabaseClient
    .from('usage_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('usage_type', type)
    .eq('period_start', periodStart)
    .single();

  const current = usage?.count ?? 0;

  return { allowed: current < limit, current, limit };
}

export async function incrementUsage(userId: string, type: UsageType): Promise<void> {
  const adminClient = getAdminClient();
  const periodStart = getPeriodStart();

  const { error } = await adminClient
    .from('usage_tracking')
    .upsert(
      {
        user_id: userId,
        usage_type: type,
        period_start: periodStart,
        count: 1,
      },
      { onConflict: 'user_id,usage_type,period_start' },
    )
    .select();

  if (error) {
    // If the upsert didn't increment, do a manual update
    const { error: updateError } = await adminClient.rpc('increment_usage', {
      p_user_id: userId,
      p_usage_type: type,
      p_period_start: periodStart,
    });

    if (updateError) {
      logger.error('Failed to increment usage', updateError, { userId, type });
    }
  }
}
