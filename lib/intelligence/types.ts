export type IntentType = 'quick_question' | 'troubleshooting' | 'mid_project' | 'full_project';

export interface IntentClassification {
  intent: IntentType
  confidence: number
  reasoning: string
}

export type FamiliarityLevel = 'novice' | 'familiar' | 'experienced';
export type CommunicationLevel = 'beginner' | 'intermediate' | 'advanced';

export type DomainCategory =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'hvac'
  | 'general'
  | 'landscaping'
  | 'painting'
  | 'roofing';

export const DOMAIN_CATEGORIES: DomainCategory[] = [
  'electrical', 'plumbing', 'carpentry', 'hvac',
  'general', 'landscaping', 'painting', 'roofing',
];

export interface SkillProfile {
  userId: string
  domainFamiliarity: Record<DomainCategory, FamiliarityLevel>
  communicationLevel: CommunicationLevel
  knownTopics: string[]
  lastCalibrated: Date
}

export interface IntentClassificationContext {
  hasActiveProjects: boolean
  activeProjectCategories?: string[]
  skillProfile?: SkillProfile | null
}

export function defaultSkillProfile(userId: string): SkillProfile {
  const familiarity: Record<DomainCategory, FamiliarityLevel> = {
    electrical: 'novice',
    plumbing: 'novice',
    carpentry: 'novice',
    hvac: 'novice',
    general: 'novice',
    landscaping: 'novice',
    painting: 'novice',
    roofing: 'novice',
  };
  return {
    userId,
    domainFamiliarity: familiarity,
    communicationLevel: 'beginner',
    knownTopics: [],
    lastCalibrated: new Date(),
  };
}
