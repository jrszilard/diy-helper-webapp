import type {
  DomainCategory,
  FamiliarityLevel,
  CommunicationLevel,
  SkillProfile,
} from './types';
import { DOMAIN_CATEGORIES } from './types';

/**
 * Infer familiarity level from the count of advanced/trade terms a user has used.
 * 0-2 = novice, 3-7 = familiar, 8+ = experienced
 */
export function inferFamiliarityFromTermCounts(count: number): FamiliarityLevel {
  if (count <= 2) return 'novice';
  if (count <= 7) return 'familiar';
  return 'experienced';
}

/**
 * Derive an overall communication level from per-domain familiarity.
 * - beginner: all domains are novice
 * - advanced: 3+ domains are experienced
 * - intermediate: everything else (1+ experienced or 2+ familiar)
 */
export function inferCommunicationLevel(
  familiarity: Record<DomainCategory, FamiliarityLevel>,
): CommunicationLevel {
  const levels = Object.values(familiarity);
  const experiencedCount = levels.filter((l) => l === 'experienced').length;
  const familiarCount = levels.filter((l) => l === 'familiar').length;

  if (experiencedCount >= 3) return 'advanced';
  if (experiencedCount >= 1 || familiarCount >= 2) return 'intermediate';
  return 'beginner';
}

const LEVEL_RANK: Record<FamiliarityLevel, number> = {
  novice: 0,
  familiar: 1,
  experienced: 2,
};

const RANK_TO_LEVEL: FamiliarityLevel[] = ['novice', 'familiar', 'experienced'];

/**
 * Merge multiple partial familiarity maps, keeping the highest level per domain.
 * Domains not present in any source default to 'novice'.
 */
export function mergeProfileSources(
  ...sources: Partial<Record<DomainCategory, FamiliarityLevel>>[]
): Record<DomainCategory, FamiliarityLevel> {
  const result = {} as Record<DomainCategory, FamiliarityLevel>;

  for (const domain of DOMAIN_CATEGORIES) {
    let maxRank = 0;
    for (const source of sources) {
      const level = source[domain];
      if (level !== undefined) {
        maxRank = Math.max(maxRank, LEVEL_RANK[level]);
      }
    }
    result[domain] = RANK_TO_LEVEL[maxRank];
  }

  return result;
}

/**
 * Assemble a full SkillProfile by combining tool inventory, completed projects,
 * conversation term counts, and explicitly known topics.
 */
export function assembleProfileFromData(
  userId: string,
  toolInventory: Partial<Record<DomainCategory, string[]>>,
  completedProjects: Partial<Record<DomainCategory, number>>,
  conversationTermCounts: Partial<Record<DomainCategory, number>>,
  knownTopics: string[],
): SkillProfile {
  // Source 1: tool inventory — owning domain-specific tools implies familiarity
  const toolFamiliarity = {} as Partial<Record<DomainCategory, FamiliarityLevel>>;
  for (const domain of DOMAIN_CATEGORIES) {
    const tools = toolInventory[domain];
    if (tools && tools.length > 0) {
      toolFamiliarity[domain] = inferFamiliarityFromTermCounts(tools.length);
    }
  }

  // Source 2: completed projects — each project counts similarly to term usage
  const projectFamiliarity = {} as Partial<Record<DomainCategory, FamiliarityLevel>>;
  for (const domain of DOMAIN_CATEGORIES) {
    const count = completedProjects[domain];
    if (count !== undefined && count > 0) {
      projectFamiliarity[domain] = inferFamiliarityFromTermCounts(count);
    }
  }

  // Source 3: conversation term counts — direct usage of trade terminology
  const termFamiliarity = {} as Partial<Record<DomainCategory, FamiliarityLevel>>;
  for (const domain of DOMAIN_CATEGORIES) {
    const count = conversationTermCounts[domain];
    if (count !== undefined && count > 0) {
      termFamiliarity[domain] = inferFamiliarityFromTermCounts(count);
    }
  }

  const domainFamiliarity = mergeProfileSources(
    toolFamiliarity,
    projectFamiliarity,
    termFamiliarity,
  );

  const communicationLevel = inferCommunicationLevel(domainFamiliarity);

  return {
    userId,
    domainFamiliarity,
    communicationLevel,
    knownTopics,
    lastCalibrated: new Date(),
  };
}
