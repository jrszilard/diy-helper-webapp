import { SupabaseClient } from '@supabase/supabase-js';
import type { ExpertProfile, ExpertProfileRow } from '@/lib/marketplace/types';
import { toExpertProfile } from '@/lib/marketplace/types';

export async function getExpertByUserId(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<ExpertProfile | null> {
  const { data, error } = await supabaseClient
    .from('expert_profiles')
    .select('*, expert_specialties(*)')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return toExpertProfile(data as ExpertProfileRow);
}

export async function getExpertById(
  supabaseClient: SupabaseClient,
  expertId: string,
): Promise<ExpertProfile | null> {
  const { data, error } = await supabaseClient
    .from('expert_profiles')
    .select('*, expert_specialties(*)')
    .eq('id', expertId)
    .single();

  if (error || !data) return null;
  return toExpertProfile(data as ExpertProfileRow);
}

export async function isExpert(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { count } = await supabaseClient
    .from('expert_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  return (count ?? 0) > 0;
}
