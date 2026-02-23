import type { StartAgentRunRequest } from '@/lib/agents/types';

export type BotPhase = 'project' | 'scope' | 'location' | 'tools' | 'preferences-experience' | 'preferences-budget' | 'summary';

export type MessageSender = 'bot' | 'user';

export interface BotMessage {
  id: string;
  sender: MessageSender;
  content: string;
  component?: string; // component key to render below text
  timestamp: number;
}

export interface GatheredData {
  projectType: string | null;
  projectDescription: string | null;
  dimensions: string | null;
  scopeDetails: string | null;
  city: string | null;
  state: string | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  budgetLevel: 'budget' | 'mid-range' | 'premium' | null;
  existingTools: string | null;
  timeframe: string | null;
}

export const INITIAL_GATHERED: GatheredData = {
  projectType: null,
  projectDescription: null,
  dimensions: null,
  scopeDetails: null,
  city: null,
  state: null,
  experienceLevel: null,
  budgetLevel: null,
  existingTools: null,
  timeframe: null,
};

export function toAgentRequest(data: GatheredData): StartAgentRunRequest {
  let description = data.projectDescription || data.projectType || 'DIY project';

  if (data.dimensions) {
    description += `\n\nDimensions/Scope: ${data.dimensions}`;
  }
  if (data.scopeDetails) {
    description += `\n\nAdditional details: ${data.scopeDetails}`;
  }
  if (data.existingTools) {
    description += `\n\nExisting tools and materials: ${data.existingTools}`;
  }

  return {
    projectDescription: description,
    city: data.city || '',
    state: data.state || '',
    budgetLevel: data.budgetLevel || 'mid-range',
    experienceLevel: data.experienceLevel || 'intermediate',
    timeframe: data.timeframe || undefined,
  };
}
