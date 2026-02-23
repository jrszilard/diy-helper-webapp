import { SupabaseClient } from '@supabase/supabase-js';

export async function updateExpertRating(
  adminClient: SupabaseClient,
  expertId: string,
): Promise<void> {
  const { data: reviews } = await adminClient
    .from('expert_reviews')
    .select('rating, created_at')
    .eq('expert_id', expertId)
    .eq('is_visible', true);

  if (!reviews || reviews.length === 0) {
    await adminClient
      .from('expert_profiles')
      .update({ avg_rating: 0, total_reviews: 0 })
      .eq('id', expertId);
    return;
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const review of reviews) {
    const createdAt = new Date(review.created_at);
    const weight = createdAt >= ninetyDaysAgo ? 2 : 1;
    weightedSum += review.rating * weight;
    totalWeight += weight;
  }

  const avgRating = totalWeight > 0 ? weightedSum / totalWeight : 0;

  await adminClient
    .from('expert_profiles')
    .update({
      avg_rating: Math.round(avgRating * 100) / 100,
      total_reviews: reviews.length,
    })
    .eq('id', expertId);
}
