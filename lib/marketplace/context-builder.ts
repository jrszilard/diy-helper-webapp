import { SupabaseClient } from '@supabase/supabase-js';
import type { ExpertContext } from '@/lib/marketplace/types';
import { logger } from '@/lib/logger';

const PROJECT_TYPE_KEYWORDS: Record<string, string[]> = {
  electrical: ['electrical', 'wiring', 'outlet', 'circuit', 'panel', 'switch', 'lighting'],
  plumbing: ['plumbing', 'pipe', 'faucet', 'drain', 'water heater', 'toilet', 'sink'],
  hvac: ['hvac', 'furnace', 'air conditioning', 'ac unit', 'ductwork', 'thermostat', 'heat pump'],
  carpentry: ['carpentry', 'wood', 'framing', 'cabinet', 'trim', 'deck', 'fence', 'shelf'],
  flooring: ['flooring', 'tile', 'hardwood', 'laminate', 'vinyl', 'carpet'],
  roofing: ['roof', 'shingle', 'gutter', 'flashing', 'soffit'],
  concrete: ['concrete', 'foundation', 'slab', 'sidewalk', 'patio'],
  drywall: ['drywall', 'sheetrock', 'plaster', 'wall repair', 'texture'],
  painting: ['painting', 'paint', 'stain', 'primer', 'wallpaper'],
  landscaping: ['landscaping', 'garden', 'irrigation', 'retaining wall', 'paver'],
};

function inferProjectType(text: string): string {
  const lower = text.toLowerCase();
  for (const [type, keywords] of Object.entries(PROJECT_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type;
  }
  return 'general';
}

export async function buildExpertContext(
  supabaseClient: SupabaseClient,
  reportId: string,
): Promise<ExpertContext | null> {
  const { data: report, error: reportError } = await supabaseClient
    .from('project_reports')
    .select('id, title, description, run_id, city, state')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    logger.warn('Failed to load report for expert context', { reportId });
    return null;
  }

  // Get the plan phase output
  const { data: planPhase } = await supabaseClient
    .from('agent_phases')
    .select('output_data')
    .eq('run_id', report.run_id)
    .eq('phase', 'plan')
    .single();

  const plan = planPhase?.output_data ?? {};

  const projectSummary = plan.summary || report.description || report.title || '';
  const projectType = inferProjectType(`${report.title || ''} ${report.description || ''} ${projectSummary}`);
  const relevantCodes = plan.codes || plan.relevantCodes || '';
  const safetyWarnings: string[] = plan.safetyWarnings || plan.safety_warnings || [];
  const proRequired = plan.proRequired ?? plan.pro_required ?? false;
  const proRequiredReason = plan.proRequiredReason || plan.pro_required_reason || undefined;
  const skillLevel = plan.skillLevel || plan.skill_level || 'intermediate';
  const estimatedCost = plan.estimatedCost || plan.estimated_cost || 0;
  const diyerExperienceLevel = plan.diyerExperienceLevel || plan.diyer_experience_level || 'beginner';

  const rawSteps = plan.steps || [];
  const steps = rawSteps.map((s: { order?: number; title?: string; skillLevel?: string; skill_level?: string }, i: number) => ({
    order: s.order ?? i + 1,
    title: s.title || `Step ${i + 1}`,
    skillLevel: s.skillLevel || s.skill_level || 'intermediate',
  }));

  return {
    projectSummary,
    projectType,
    location: {
      city: report.city || '',
      state: report.state || '',
    },
    relevantCodes,
    safetyWarnings,
    proRequired,
    proRequiredReason,
    skillLevel,
    estimatedCost: Number(estimatedCost),
    steps,
    diyerExperienceLevel,
    materialsCount: plan.materialsCount || plan.materials_count,
    toolsCount: plan.toolsCount || plan.tools_count,
  };
}
