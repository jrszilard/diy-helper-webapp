// Weighted few-shot example retrieval from Supabase.
// Higher-weight examples (expert corrections) are prioritized over
// lower-weight ones (synthetic seed data) via weighted random sampling.
//
// Research basis: Asawa et al. (2025) arXiv:2510.02453
// §7: Diversity sampling prevents confirmation bias.

import { getAdminClient } from '@/lib/supabase-admin';
import type { FewShotExample } from '@/lib/advisor-rubric';
import { logger } from '@/lib/logger';

interface RubricRow {
  user_question: string;
  bad_response: string;
  good_response: string;
  rubric_items_failed: number[];
  severity: 'critical' | 'warning';
  weight: number;
}

function weightedSample<T extends { weight: number }>(items: T[], n: number): T[] {
  if (items.length <= n) return items;

  const selected: T[] = [];
  const pool = [...items];

  for (let i = 0; i < n && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (let j = 0; j < pool.length; j++) {
      random -= pool[j].weight;
      if (random <= 0) {
        selected.push(pool[j]);
        pool.splice(j, 1);
        break;
      }
    }
  }

  return selected;
}

export async function getWeightedExamples(
  category: string,
  limit: number = 5,
): Promise<FewShotExample[]> {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('advisor_rubric_examples')
      .select('user_question, bad_response, good_response, rubric_items_failed, severity, weight')
      .eq('is_active', true)
      .or(`category.eq.${category},category.eq.general`)
      .order('weight', { ascending: false })
      .limit(limit * 3);

    if (error) {
      logger.error('Failed to fetch rubric examples', { error, category });
      return [];
    }

    if (!data || data.length === 0) return [];

    const sampled = weightedSample(data as RubricRow[], limit);

    return sampled.map(row => ({
      userQuestion: row.user_question,
      badResponse: row.bad_response,
      goodResponse: row.good_response,
      rubricItemsFailed: row.rubric_items_failed,
      severity: row.severity,
    }));
  } catch (err) {
    logger.error('Exception fetching rubric examples', { error: err, category });
    return [];
  }
}
