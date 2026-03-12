import type { SkillProfile, DomainCategory, FamiliarityLevel } from './types';
import { DOMAIN_CATEGORIES } from './types';

/**
 * Calibrate a base system prompt based on the user's skill profile.
 * Returns the base prompt unchanged when no profile is available.
 */
export function calibratePrompt(
  basePrompt: string,
  profile: SkillProfile | null | undefined,
): string {
  if (!profile) return basePrompt;

  const lines: string[] = [basePrompt, '', '--- Skill Calibration ---'];

  // Communication level guidance
  switch (profile.communicationLevel) {
    case 'beginner':
      lines.push(
        'This user is a beginner — always explain concepts in detail using everyday language.',
        'Avoid trade jargon unless you define it. Include step-by-step instructions with context for why each step matters.',
      );
      break;
    case 'intermediate':
      lines.push(
        'This user has intermediate experience. Provide brief explanations of concepts.',
        'You can use common trade terms but clarify less-common ones.',
      );
      break;
    case 'advanced':
      lines.push(
        'This user is experienced and advanced. Be concise and use trade terminology freely.',
        'Skip basic explanations unless the user asks. Focus on specifics, code requirements, and best practices.',
      );
      break;
  }

  // Per-domain guidance
  const experienced = domainsByLevel(profile.domainFamiliarity, 'experienced');
  const novice = domainsByLevel(profile.domainFamiliarity, 'novice');

  if (experienced.length > 0) {
    lines.push(
      `The user is experienced in: ${experienced.join(', ')}. Skip basics in these domains.`,
    );
  }

  if (novice.length > 0) {
    lines.push(
      `The user is novice in: ${novice.join(', ')}. Explain more in these domains, even if the user is advanced elsewhere.`,
    );
  }

  // Known topics
  if (profile.knownTopics.length > 0) {
    lines.push(
      `The user already knows about: ${profile.knownTopics.join(', ')}. Do not re-explain these topics unless asked.`,
    );
  }

  // Safety reminder — ALWAYS included regardless of skill level
  lines.push(
    '',
    'SAFETY REMINDER: Always include relevant safety warnings, required protective gear, and permit requirements.',
    'Even experienced users must be reminded about permits, local codes, and safety precautions. Never omit safety guidance.',
  );

  return lines.join('\n');
}

function domainsByLevel(
  familiarity: Record<DomainCategory, FamiliarityLevel>,
  level: FamiliarityLevel,
): DomainCategory[] {
  return DOMAIN_CATEGORIES.filter((d) => familiarity[d] === level);
}
